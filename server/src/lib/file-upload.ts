import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const DEFAULT_FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';
export const DEFAULT_MAX_SIZE_MB = 5;
export const HARD_MAX_SIZE_MB = 25;
export const DEFAULT_MAX_FILES = 3;
export const HARD_MAX_FILES = 10;

export interface UploadedFileItem {
  id: number;
  documentId?: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  ext?: string;
}

export interface RawUploadedFile {
  filepath: string;
  originalFilename?: string;
  newFilename?: string;
  mimetype?: string;
  size?: number;
}

export interface FileFieldConfig {
  id?: string;
  type?: string;
  name: string;
  label?: string;
  required?: boolean;
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  maxFiles?: number;
  validation?: Array<{ type: string; value?: any; message?: string }>;
}

export interface SanitizedFileForStrapi {
  filepath: string;
  originalFilename: string;
  displayName: string;
  mimetype: string;
  detectedMimeType: string;
  size: number;
  ext: string;
}

export interface UploadSecurityConfig {
  allowedTypes?: string[];
  deniedTypes?: string[];
}

interface SafeFileTypeSpec {
  mime: string;
  category: 'image' | 'document' | 'archive' | 'audio' | 'video';
  verify: (buf: Buffer, ext: string) => { ok: boolean; reason?: string };
}

const MAX_ZIP_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 10000;
const OOXML_EXTS = new Set(['.docx', '.xlsx', '.pptx']);
const ODF_EXTS = new Set(['.odt', '.ods', '.odp']);
const ZIP_BASED_OFFICE_EXTS = new Set([...OOXML_EXTS, ...ODF_EXTS]);

function startsWithBytes(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function decodePdfNameEscapes(nameToken: string): string {
  return nameToken.replace(/#([0-9a-fA-F]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function maskSafePdfUris(rawText: string): { masked: string; hasUnsafeUriScheme: boolean } {
  let out = '';
  let i = 0;
  let hasUnsafeUriScheme = false;
  let inComment = false;

  while (i < rawText.length) {
    const ch = rawText[i];
    if (ch === '\r' || ch === '\n') {
      inComment = false;
      out += ch;
      i++;
      continue;
    }
    if (inComment) {
      out += ch;
      i++;
      continue;
    }
    if (ch === '%') {
      inComment = true;
      out += ch;
      i++;
      continue;
    }

    const prev = i === 0 ? ' ' : rawText[i - 1];
    if (
      rawText.startsWith('/URI', i) &&
      /[\s<>()\[\]{}/]/.test(prev)
    ) {
      let j = i + 4;
      while (j < rawText.length && (rawText[j] === ' ' || rawText[j] === '\t')) j++;
      if (rawText[j] === '(') {
        let depth = 1;
        let k = j + 1;
        let broken = false;
        while (k < rawText.length && depth > 0) {
          const c = rawText[k];
          if (c === '\r' || c === '\n') {
            broken = true;
            break;
          }
          if (c === '\\' && k + 1 < rawText.length) {
            k += 2;
            continue;
          }
          if (c === '(') depth++;
          else if (c === ')') depth--;
          k++;
        }
        if (!broken && depth === 0) {
          const uriBody = rawText.slice(j + 1, k - 1);
          if (/^\s*(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i.test(uriBody)) {
            hasUnsafeUriScheme = true;
          }
          out += rawText.slice(i, j + 1) + ')';
          i = k;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }

  return { masked: out, hasUnsafeUriScheme };
}

function verifyPdfBuffer(buf: Buffer): { ok: boolean; reason?: string } {
  // %PDF-
  if (!startsWithBytes(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { ok: false, reason: 'Invalid PDF header signature' };
  }
  const rawText = buf.toString('latin1');
  const { masked: withoutUris, hasUnsafeUriScheme } = maskSafePdfUris(rawText);

  if (hasUnsafeUriScheme) {
    return { ok: false, reason: 'PDF contains disallowed active or script actions' };
  }

  // Match chained PDF Name sequences (e.g. /Type/Catalog/OpenAction, [1 0 R]/JS) and decode #XX escapes
  // only inside PDF Name tokens rather than across compressed binary streams.
  const nameChainRegex = /(?<=^|[\s<>()\[\]{}/])((?:\/[A-Za-z0-9_.#-]+)+)/g;
  let match: RegExpExecArray | null;
  while ((match = nameChainRegex.exec(withoutUris)) !== null) {
    const tokens = match[1].split('/').filter(Boolean);
    for (const tok of tokens) {
      const decodedName = `/${decodePdfNameEscapes(tok)}`;
      if (
        /^\/(?:JavaScript|JS|Launch|SubmitForm|ImportData|RichMedia|OpenAction|AA|GoToR|GoToE)$/i.test(
          decodedName
        )
      ) {
        return { ok: false, reason: 'PDF contains disallowed active or script actions' };
      }
    }
  }
  return { ok: true };
}

function verifyImageBuffer(
  buf: Buffer,
  magicOk: boolean,
  invalidSigReason: string
): { ok: boolean; reason?: string } {
  if (!magicOk) {
    return { ok: false, reason: invalidSigReason };
  }
  const text = buf.toString('latin1');
  if (/(?:<\?php|<script\b|<!doctype\s+html|<html\b|<iframe\b|<svg\b)/i.test(text)) {
    return { ok: false, reason: 'Image contains disallowed embedded script or markup payload' };
  }
  return { ok: true };
}

const VBA_PROJECT_UTF16LE = Buffer.from('_VBA_PROJECT', 'utf16le');

function verifyOle2Buffer(buf: Buffer): { ok: boolean; reason?: string } {
  // D0 CF 11 E0 A1 B1 1A E1
  if (!startsWithBytes(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { ok: false, reason: 'Invalid Office document signature' };
  }
  // OLE2 directory entry stream names are UTF-16LE (check exact bytes + case-insensitive
  // UTF-16LE across both alignments, plus Latin-1 for embedded project references).
  if (buf.includes(VBA_PROJECT_UTF16LE)) {
    return { ok: false, reason: 'Office documents with embedded macros are not allowed' };
  }
  const utf16Even = buf.toString('utf16le');
  const utf16Odd = buf.length > 1 ? buf.subarray(1).toString('utf16le') : '';
  const latin1 = buf.toString('latin1');
  if (
    /_VBA_PROJECT|VBAProject/i.test(utf16Even) ||
    /_VBA_PROJECT|VBAProject/i.test(utf16Odd) ||
    /_VBA_PROJECT|VBAProject/i.test(latin1)
  ) {
    return { ok: false, reason: 'Office documents with embedded macros are not allowed' };
  }
  return { ok: true };
}

function isPrintableEntryName(slice: Buffer): boolean {
  if (slice.length === 0 || slice.length > 1024) return false;
  for (let k = 0; k < slice.length; k++) {
    const b = slice[k];
    if (b < 0x20 || b === 0x7f) return false;
  }
  return true;
}

/**
 * Extract Info-ZIP Unicode Path Extra Field (tag 0x7075) if present so a crafted archive
 * cannot smuggle path traversal in the UTF-8 extra field while keeping a clean base name.
 */
function extractUnicodeExtraPath(extra: Buffer): string | null {
  let pos = 0;
  while (pos + 4 <= extra.length) {
    const tag = extra.readUInt16LE(pos);
    const size = extra.readUInt16LE(pos + 2);
    if (pos + 4 + size > extra.length) break;
    if (tag === 0x7075 && size >= 5) {
      return extra.subarray(pos + 9, pos + 4 + size).toString('utf8');
    }
    pos += 4 + size;
  }
  return null;
}

function findEocdOffset(buf: Buffer): number {
  const minOffset = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      const commentLen = buf.readUInt16LE(i + 20);
      if (i + 22 + commentLen === buf.length) {
        return i;
      }
    }
  }
  return -1;
}

function verifyZipOrOoxmlBuffer(buf: Buffer, ext: string): { ok: boolean; reason?: string } {
  // Standard PKZIP local file header at offset 0: 50 4B 03 04 (minimum 30 bytes)
  if (buf.length < 30 || !startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04])) {
    return { ok: false, reason: 'Invalid archive or Office XML signature' };
  }

  // Strictly validate the first Local File Header at offset 0
  const firstNameLen = buf.readUInt16LE(26);
  const firstExtraLen = buf.readUInt16LE(28);
  if (
    firstNameLen === 0 ||
    firstNameLen > 1024 ||
    30 + firstNameLen + firstExtraLen > buf.length ||
    !isPrintableEntryName(buf.subarray(30, 30 + firstNameLen))
  ) {
    return { ok: false, reason: 'Corrupted archive header' };
  }

  const entryNames: string[] = [];
  let totalUncompressedBytes = 0;

  // When an End of Central Directory (EOCD) record is present, strictly walk the entire
  // Central Directory and verify it spans exactly [cdOffset, eocdOffset) with matching entry count.
  const eocdOffset = findEocdOffset(buf);
  if (eocdOffset >= 0) {
    const totalEntries = buf.readUInt16LE(eocdOffset + 10);
    const cdSize = buf.readUInt32LE(eocdOffset + 12);
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);
    if (
      cdOffset === 0xffffffff ||
      cdSize === 0xffffffff ||
      totalEntries === 0xffff ||
      cdOffset + cdSize !== eocdOffset ||
      (totalEntries === 0) !== (cdSize === 0) ||
      totalEntries > MAX_ZIP_ENTRIES
    ) {
      return { ok: false, reason: 'Corrupted or unsupported archive directory' };
    }
    let pos = cdOffset;
    let parsedEntries = 0;
    while (pos < cdOffset + cdSize) {
      if (
        pos + 46 > cdOffset + cdSize ||
        buf[pos] !== 0x50 ||
        buf[pos + 1] !== 0x4b ||
        buf[pos + 2] !== 0x01 ||
        buf[pos + 3] !== 0x02
      ) {
        return { ok: false, reason: 'Corrupted archive central directory' };
      }
      const uncompressedSize = buf.readUInt32LE(pos + 24);
      const nameLen = buf.readUInt16LE(pos + 28);
      const extraLen = buf.readUInt16LE(pos + 30);
      const commentLen = buf.readUInt16LE(pos + 32);
      const nameStart = pos + 46;
      const nameEnd = nameStart + nameLen;
      if (
        nameLen === 0 ||
        nameLen > 1024 ||
        nameEnd + extraLen + commentLen > cdOffset + cdSize ||
        !isPrintableEntryName(buf.subarray(nameStart, nameEnd))
      ) {
        return { ok: false, reason: 'Corrupted archive central directory entry' };
      }
      if (uncompressedSize === 0xffffffff) {
        return { ok: false, reason: 'Unsupported archive entry size' };
      }
      totalUncompressedBytes += uncompressedSize;
      if (totalUncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
        return { ok: false, reason: 'Archive uncompressed size exceeds safety limit' };
      }
      entryNames.push(buf.subarray(nameStart, nameEnd).toString('utf8'));
      const unicodeExtra = extractUnicodeExtraPath(buf.subarray(nameEnd, nameEnd + extraLen));
      if (unicodeExtra) entryNames.push(unicodeExtra);
      pos = nameEnd + extraLen + commentLen;
      parsedEntries++;
      if (parsedEntries > MAX_ZIP_ENTRIES) {
        return { ok: false, reason: 'Archive contains too many entries' };
      }
    }
    if (parsedEntries !== totalEntries) {
      return { ok: false, reason: 'Corrupted archive central directory count' };
    }
  }

  // Also scan every offset i++ across the buffer without jumping over `extraLen` so a crafted
  // fake header inside uncompressed payload data can never skip over a subsequent real header
  // (also covers header-only archives without an EOCD record).
  let lfhUncompressedSum = 0;
  for (let i = 0; i <= buf.length - 30; i++) {
    // Local file header: 50 4B 03 04
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x03 &&
      buf[i + 3] === 0x04
    ) {
      const uncompressedSize = buf.readUInt32LE(i + 22);
      const nameLen = buf.readUInt16LE(i + 26);
      const extraLen = buf.readUInt16LE(i + 28);
      const nameStart = i + 30;
      const nameEnd = nameStart + nameLen;
      if (
        nameLen > 0 &&
        nameLen <= 1024 &&
        nameEnd + extraLen <= buf.length &&
        isPrintableEntryName(buf.subarray(nameStart, nameEnd))
      ) {
        if (uncompressedSize === 0xffffffff) {
          return { ok: false, reason: 'Unsupported archive entry size' };
        }
        lfhUncompressedSum += uncompressedSize;
        if (
          uncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES ||
          (eocdOffset < 0 && lfhUncompressedSum > MAX_ZIP_UNCOMPRESSED_BYTES)
        ) {
          return { ok: false, reason: 'Archive entry uncompressed size exceeds safety limit' };
        }
        entryNames.push(buf.subarray(nameStart, nameEnd).toString('utf8'));
        const unicodeExtra = extractUnicodeExtraPath(buf.subarray(nameEnd, nameEnd + extraLen));
        if (unicodeExtra) entryNames.push(unicodeExtra);
      }
    }
    // Central directory header fallback (only when no EOCD record exists)
    if (
      eocdOffset < 0 &&
      i <= buf.length - 46 &&
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x01 &&
      buf[i + 3] === 0x02
    ) {
      const uncompressedSize = buf.readUInt32LE(i + 24);
      const nameLen = buf.readUInt16LE(i + 28);
      const extraLen = buf.readUInt16LE(i + 30);
      const commentLen = buf.readUInt16LE(i + 32);
      const nameStart = i + 46;
      const nameEnd = nameStart + nameLen;
      if (
        nameLen > 0 &&
        nameLen <= 1024 &&
        nameEnd + extraLen + commentLen <= buf.length &&
        isPrintableEntryName(buf.subarray(nameStart, nameEnd))
      ) {
        if (uncompressedSize === 0xffffffff || uncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES) {
          return { ok: false, reason: 'Archive entry uncompressed size exceeds safety limit' };
        }
        entryNames.push(buf.subarray(nameStart, nameEnd).toString('utf8'));
        const unicodeExtra = extractUnicodeExtraPath(buf.subarray(nameEnd, nameEnd + extraLen));
        if (unicodeExtra) entryNames.push(unicodeExtra);
      }
    }
  }

  if (entryNames.length === 0) {
    return { ok: false, reason: 'Archive contains no valid entries' };
  }

  const normalizedNames = new Set<string>();
  for (const name of entryNames) {
    if (
      name.includes('\x00') ||
      name.startsWith('/') ||
      name.startsWith('\\') ||
      /^[a-zA-Z]:/.test(name) ||
      /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(name)
    ) {
      return { ok: false, reason: 'Archive contains unsafe path traversal entry' };
    }
    if (
      /vbaProject\.bin$/i.test(name) ||
      /(?:^|[\\/])macros[\\/]/i.test(name) ||
      (ODF_EXTS.has(ext) && /(?:^|[\\/])(?:Basic|Scripts)[\\/]/i.test(name))
    ) {
      return { ok: false, reason: 'Documents with embedded macros are not allowed' };
    }
    normalizedNames.add(name.replace(/\\/g, '/').toLowerCase());
  }

  const raw = buf.toString('latin1');
  if (/vbaProject\.bin/i.test(raw) || /_VBA_PROJECT/i.test(raw)) {
    return { ok: false, reason: 'Documents with embedded macros are not allowed' };
  }

  if (OOXML_EXTS.has(ext) && !normalizedNames.has('[content_types].xml')) {
    return { ok: false, reason: 'Invalid Office XML package structure' };
  }
  if (ODF_EXTS.has(ext) && !normalizedNames.has('mimetype')) {
    return { ok: false, reason: 'Invalid OpenDocument package structure' };
  }

  return { ok: true };
}

/**
 * Linear-time O(N) CSV formula / DDE injection detector (no regex backtracking).
 * Rejects cells whose unquoted content starts with `=`, `@` (formula), or `+`/`-` when
 * non-numeric (e.g. `=CMD|...`, `+1+CMD|...`, `-1+CMD|...`, `@SUM(...)`), while permitting
 * plain signed numbers like `-42` or `+3.14`.
 */
function hasUnsafeCsvFormula(text: string): boolean {
  let i = 0;
  const len = text.length;
  let atCellStart = true;
  let inQuotes = false;

  const isHorizontalWs = (ch: string) =>
    ch === '\uFEFF' || ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f';

  while (i < len) {
    if (atCellStart) {
      while (i < len && isHorizontalWs(text[i])) {
        i++;
      }
      if (i >= len) break;

      let cellQuoted = false;
      if (text[i] === '"') {
        cellQuoted = true;
        inQuotes = true;
        i++;
        while (i < len && isHorizontalWs(text[i])) {
          i++;
        }
      }

      if (i < len) {
        const first = text[i];
        if (first === '=' || first === '@') {
          return true;
        }
        if (first === '+' || first === '-') {
          // Read until end of CSV cell (comma, semicolon, or newline; never break on tab inside CSV cell)
          let j = i;
          while (j < len) {
            const ch = text[j];
            if (cellQuoted) {
              if (ch === '"') {
                if (j + 1 < len && text[j + 1] === '"') {
                  j += 2;
                  continue;
                }
                break;
              }
            } else if (ch === ',' || ch === ';' || ch === '\r' || ch === '\n') {
              break;
            }
            j++;
          }
          const cellVal = text.slice(i, j).trim();
          // Allow purely numeric signed values like -42 or +3.14; reject expressions like +1+CMD or -1\t&HYPERLINK
          if (!/^[+-]\d+(?:\.\d+)?$/.test(cellVal)) {
            return true;
          }
        }
      }
      atCellStart = false;
      continue;
    }

    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < len && text[i + 1] === '"') {
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === ',' || ch === ';' || ch === '\r' || ch === '\n')) {
      atCellStart = true;
    }
    i++;
  }

  return false;
}

function verifyTextOrCsvBuffer(buf: Buffer, ext: string): { ok: boolean; reason?: string } {
  if (buf.length === 0) {
    return { ok: false, reason: 'File is empty' };
  }
  // Reject binary signatures or null bytes
  if (
    startsWithBytes(buf, [0x4d, 0x5a]) || // MZ (PE/EXE)
    startsWithBytes(buf, [0x7f, 0x45, 0x4c, 0x46]) || // ELF
    startsWithBytes(buf, [0xca, 0xfe, 0xba, 0xbe]) || // Mach-O
    startsWithBytes(buf, [0x23, 0x21]) // #! shebang script
  ) {
    return { ok: false, reason: 'Executable or script content is not allowed' };
  }

  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (byte === 0x00) {
      return { ok: false, reason: 'Text file contains binary null bytes' };
    }
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
      return { ok: false, reason: 'Text file contains invalid control characters' };
    }
  }

  const text = buf.toString('utf8');
  if (
    /<!doctype\s+html/i.test(text) ||
    /<(?:script|iframe|object|embed|svg|html|body|meta|link|style|form)\b/i.test(text) ||
    /javascript\s*:/i.test(text) ||
    /\bon(?:load|error|click|mouseover|focus)\s*=/i.test(text)
  ) {
    return { ok: false, reason: 'Text file contains disallowed HTML or script markup' };
  }

  if (ext === '.csv') {
    if (hasUnsafeCsvFormula(text)) {
      return { ok: false, reason: 'CSV contains potentially unsafe spreadsheet formulas' };
    }
  }

  return { ok: true };
}

function hasUnsafeRtfFldinst(text: string): boolean {
  const fldinstRegex = /\\fldinst\b/gi;
  let match: RegExpExecArray | null;
  while ((match = fldinstRegex.exec(text)) !== null) {
    // Walk forward tracking brace depth so nested groups like {\f1 } inside \fldinst cannot bypass
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === '\\' && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const groupSlice = text.slice(match.index, i).replace(/\\'[0-9a-fA-F]{2}/g, (m) =>
      String.fromCharCode(parseInt(m.slice(2), 16))
    );
    if (/\b(?:DDE|DDEAUTO|INCLUDEPICTURE|LINK)\b/i.test(groupSlice)) {
      return true;
    }
  }
  return false;
}

function verifyRtfBuffer(buf: Buffer): { ok: boolean; reason?: string } {
  // {\rtf
  if (!startsWithBytes(buf, [0x7b, 0x5c, 0x72, 0x74, 0x66])) {
    return { ok: false, reason: 'Invalid RTF signature' };
  }
  const text = buf.toString('latin1');
  if (
    /\\(?:object|objdata|objemb|objautlink|objlink|objocx|objhtml|objupdate|objclass)\b/i.test(
      text
    ) ||
    hasUnsafeRtfFldinst(text)
  ) {
    return { ok: false, reason: 'RTF contains disallowed embedded objects' };
  }
  return { ok: true };
}

export const SAFE_FILE_TYPES: Readonly<Record<string, SafeFileTypeSpec>> = Object.freeze({
  '.pdf': {
    mime: 'application/pdf',
    category: 'document',
    verify: (buf) => verifyPdfBuffer(buf),
  },
  '.png': {
    mime: 'image/png',
    category: 'image',
    verify: (buf) =>
      verifyImageBuffer(
        buf,
        startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'Invalid PNG signature'
      ),
  },
  '.jpg': {
    mime: 'image/jpeg',
    category: 'image',
    verify: (buf) =>
      verifyImageBuffer(buf, startsWithBytes(buf, [0xff, 0xd8, 0xff]), 'Invalid JPEG signature'),
  },
  '.jpeg': {
    mime: 'image/jpeg',
    category: 'image',
    verify: (buf) =>
      verifyImageBuffer(buf, startsWithBytes(buf, [0xff, 0xd8, 0xff]), 'Invalid JPEG signature'),
  },
  '.gif': {
    mime: 'image/gif',
    category: 'image',
    verify: (buf) =>
      verifyImageBuffer(
        buf,
        startsWithBytes(buf, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
          startsWithBytes(buf, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
        'Invalid GIF signature'
      ),
  },
  '.webp': {
    mime: 'image/webp',
    category: 'image',
    verify: (buf) =>
      verifyImageBuffer(
        buf,
        buf.length >= 12 &&
          startsWithBytes(buf, [0x52, 0x49, 0x46, 0x46], 0) &&
          startsWithBytes(buf, [0x57, 0x45, 0x42, 0x50], 8),
        'Invalid WebP signature'
      ),
  },
  '.doc': {
    mime: 'application/msword',
    category: 'document',
    verify: (buf) => verifyOle2Buffer(buf),
  },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.xls': {
    mime: 'application/vnd.ms-excel',
    category: 'document',
    verify: (buf) => verifyOle2Buffer(buf),
  },
  '.xlsx': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.ppt': {
    mime: 'application/vnd.ms-powerpoint',
    category: 'document',
    verify: (buf) => verifyOle2Buffer(buf),
  },
  '.pptx': {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.odt': {
    mime: 'application/vnd.oasis.opendocument.text',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.ods': {
    mime: 'application/vnd.oasis.opendocument.spreadsheet',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.odp': {
    mime: 'application/vnd.oasis.opendocument.presentation',
    category: 'document',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.txt': {
    mime: 'text/plain',
    category: 'document',
    verify: (buf, ext) => verifyTextOrCsvBuffer(buf, ext),
  },
  '.csv': {
    mime: 'text/csv',
    category: 'document',
    verify: (buf, ext) => verifyTextOrCsvBuffer(buf, ext),
  },
  '.rtf': {
    mime: 'application/rtf',
    category: 'document',
    verify: (buf) => verifyRtfBuffer(buf),
  },
  '.zip': {
    mime: 'application/zip',
    category: 'archive',
    verify: (buf, ext) => verifyZipOrOoxmlBuffer(buf, ext),
  },
  '.mp3': {
    mime: 'audio/mpeg',
    category: 'audio',
    verify: (buf) =>
      startsWithBytes(buf, [0x49, 0x44, 0x33]) ||
      startsWithBytes(buf, [0xff, 0xfb]) ||
      startsWithBytes(buf, [0xff, 0xf3]) ||
      startsWithBytes(buf, [0xff, 0xf2]) ||
      startsWithBytes(buf, [0xff, 0xfa])
        ? { ok: true }
        : { ok: false, reason: 'Invalid MP3 audio signature' },
  },
  '.wav': {
    mime: 'audio/wav',
    category: 'audio',
    verify: (buf) =>
      buf.length >= 12 &&
      startsWithBytes(buf, [0x52, 0x49, 0x46, 0x46], 0) &&
      startsWithBytes(buf, [0x57, 0x41, 0x56, 0x45], 8)
        ? { ok: true }
        : { ok: false, reason: 'Invalid WAV audio signature' },
  },
  '.mp4': {
    mime: 'video/mp4',
    category: 'video',
    verify: (buf) =>
      buf.length >= 12 && startsWithBytes(buf, [0x66, 0x74, 0x79, 0x70], 4)
        ? { ok: true }
        : { ok: false, reason: 'Invalid MP4 video signature' },
  },
});

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Parse a field's `accept` configuration into a normalized list of safe extensions.
 * Any unsafe or executable extension is filtered out by intersecting with SAFE_FILE_TYPES.
 */
export function parseAllowedExtensions(accept?: string): string[] {
  const raw = typeof accept === 'string' && accept.trim().length > 0 ? accept : DEFAULT_FILE_ACCEPT;
  const tokens = raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set<string>();
  const allSafeExts = Object.keys(SAFE_FILE_TYPES);

  for (const token of tokens) {
    if (token === '*' || token === '*/*') {
      allSafeExts.forEach((ext) => allowed.add(ext));
      continue;
    }
    if (token === 'image/*') {
      allSafeExts
        .filter((ext) => SAFE_FILE_TYPES[ext].category === 'image')
        .forEach((ext) => allowed.add(ext));
      continue;
    }
    if (token === 'audio/*') {
      allSafeExts
        .filter((ext) => SAFE_FILE_TYPES[ext].category === 'audio')
        .forEach((ext) => allowed.add(ext));
      continue;
    }
    if (token === 'video/*') {
      allSafeExts
        .filter((ext) => SAFE_FILE_TYPES[ext].category === 'video')
        .forEach((ext) => allowed.add(ext));
      continue;
    }
    if (token.includes('/')) {
      allSafeExts
        .filter((ext) => SAFE_FILE_TYPES[ext].mime === token)
        .forEach((ext) => allowed.add(ext));
      continue;
    }
    const normalizedExt = token.startsWith('.') ? token : `.${token}`;
    if (Object.prototype.hasOwnProperty.call(SAFE_FILE_TYPES, normalizedExt)) {
      allowed.add(normalizedExt);
    }
  }

  if (allowed.size === 0) {
    return DEFAULT_FILE_ACCEPT.split(',').map((e) => e.trim());
  }

  return Array.from(allowed);
}

/**
 * Clamp `maxSizeMb` to a safe positive number within [0.1, HARD_MAX_SIZE_MB].
 */
export function resolveMaxSizeMb(maxSizeMb?: number): number {
  const num = Number(maxSizeMb);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_MAX_SIZE_MB;
  return Math.min(Math.max(num, 0.1), HARD_MAX_SIZE_MB);
}

/**
 * Clamp `maxFiles` depending on whether `multiple` is enabled.
 */
export function resolveMaxFiles(multiple?: boolean, maxFiles?: number): number {
  if (!multiple) return 1;
  const num = Math.floor(Number(maxFiles));
  if (!Number.isFinite(num) || num < 1) return DEFAULT_MAX_FILES;
  return Math.min(num, HARD_MAX_FILES);
}

/**
 * Sanitize an untrusted user filename:
 * - Strips path traversal segments (`../`, `..\\`, leading slashes)
 * - Strips control characters and dangerous characters
 * - Rejects Windows reserved names
 * - Rejects double extensions where an inner segment is an executable/script
 * - Generates a unique storage filename with a random UUID suffix
 */
export function sanitizeFilename(rawName: string): {
  displayName: string;
  storageName: string;
  ext: string;
  hasDangerousDoubleExtension: boolean;
} {
  const cleanedRaw = String(rawName || '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '/');
  const base = path.posix.basename(cleanedRaw).trim();

  const ext = path.posix.extname(base).toLowerCase();
  const rawStem = ext ? base.slice(0, base.length - ext.length) : base;

  // Detect dangerous double extensions like "invoice.php.jpg", "shell.php.en.jpg", or "payload.exe .pdf"
  // while allowing legitimate single-extension names like "js.pdf" or "svg.png".
  const DANGEROUS_INNER_EXT =
    /\.(?:php\d?|phtml|phar|exe|dll|bat|cmd|sh|bash|zsh|ps1|vbs|js|mjs|cjs|jsp|asp|aspx|py|rb|pl|cgi|htaccess|svg|html?|xhtml|ssi|wasm)\s*(?:\.|$)/i;
  const hasDangerousDoubleExtension =
    DANGEROUS_INNER_EXT.test(rawStem) || /^(?:\.?)htaccess$/i.test(rawStem);

  let stem = rawStem
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');

  if (!stem || WINDOWS_RESERVED_NAMES.test(stem)) {
    stem = 'file';
  }
  if (stem.length > 80) {
    stem = stem.slice(0, 80);
  }

  const safeExt = /^[.][a-z0-9]{1,10}$/.test(ext) ? ext : '';
  const displayName = `${stem}${safeExt}`;
  const uuidSuffix = crypto.randomUUID().slice(0, 8);
  const storageName = `${stem}-${uuidSuffix}${safeExt}`;

  return {
    displayName,
    storageName,
    ext: safeExt,
    hasDangerousDoubleExtension,
  };
}

/**
 * Verify that a temporary upload file path (provided by formidable/koa-body)
 * points to an existing regular file and is not a symlink or directory.
 */
export function verifyTempFilePath(filepath: string): {
  ok: boolean;
  realPath?: string;
  size?: number;
  reason?: string;
} {
  if (!filepath || typeof filepath !== 'string') {
    return { ok: false, reason: 'Missing temporary file path' };
  }
  try {
    const lstat = fs.lstatSync(filepath);
    if (lstat.isSymbolicLink() || !lstat.isFile()) {
      return { ok: false, reason: 'Temporary upload path must be a regular file' };
    }
    const realFile = fs.realpathSync(filepath);
    return { ok: true, realPath: realFile, size: lstat.size };
  } catch {
    return { ok: false, reason: 'Temporary upload file could not be accessed' };
  }
}

function matchesMimePattern(mimeType: string, patterns?: string[]): boolean {
  if (!Array.isArray(patterns) || patterns.length === 0) return false;
  const normalizedMime = mimeType.toLowerCase();
  return patterns.some((pattern) => {
    if (typeof pattern !== 'string' || !pattern.trim()) return false;
    const normalizedPattern = pattern.trim().toLowerCase();
    if (normalizedPattern.includes('*')) {
      const escaped = normalizedPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`).test(normalizedMime);
    }
    return normalizedPattern === normalizedMime;
  });
}

/**
 * Read Strapi's `plugin::upload.security` configuration safely using array-path lookup
 * (avoiding lodash dot-splitting on `'plugin::upload'`).
 */
export function getUploadSecurityConfig(strapi: any): UploadSecurityConfig {
  const cfg =
    strapi?.config?.get?.(['plugin::upload', 'security'], {}) ??
    strapi?.config?.get?.('plugin::upload')?.security ??
    {};
  if (!cfg || typeof cfg !== 'object') return {};
  const result: UploadSecurityConfig = {};
  if (Array.isArray(cfg.allowedTypes)) {
    result.allowedTypes = cfg.allowedTypes.filter((x: unknown): x is string => typeof x === 'string');
  }
  if (Array.isArray(cfg.deniedTypes)) {
    result.deniedTypes = cfg.deniedTypes.filter((x: unknown): x is string => typeof x === 'string');
  }
  return result;
}

/**
 * Enforce Strapi's host `upload.security` `allowedTypes` / `deniedTypes` policy
 * (mirrors `@strapi/upload`'s `mime-validation` semantics).
 */
export function isAllowedByUploadSecurity(
  mime: string,
  ext: string,
  security?: UploadSecurityConfig
): { ok: boolean; reason?: string } {
  if (!security || typeof security !== 'object') return { ok: true };
  const { allowedTypes, deniedTypes } = security;

  if (Array.isArray(deniedTypes) && deniedTypes.length > 0) {
    if (
      matchesMimePattern(mime, deniedTypes) ||
      (ZIP_BASED_OFFICE_EXTS.has(ext) && matchesMimePattern('application/zip', deniedTypes))
    ) {
      return { ok: false, reason: `File type "${mime}" is denied by host upload security policy` };
    }
  }

  if (Array.isArray(allowedTypes)) {
    if (allowedTypes.length === 0) {
      return { ok: false, reason: 'Host upload security policy allow list is empty' };
    }
    if (!matchesMimePattern(mime, allowedTypes)) {
      return {
        ok: false,
        reason: `File type "${mime}" is not permitted by host upload security policy`,
      };
    }
  }

  return { ok: true };
}

/**
 * Validate and sanitize all uploaded files for a single `file` field.
 * Checks required constraint, file count, byte size, extension allow-list,
 * host upload security policy, double-extension attacks, and binary magic bytes.
 */
export function validateUploadedFilesForField(
  field: FileFieldConfig,
  rawFiles: RawUploadedFile[] | undefined,
  options?: { uploadSecurity?: UploadSecurityConfig }
): {
  valid: boolean;
  errors: string[];
  sanitizedFiles: SanitizedFileForStrapi[];
} {
  const errors: string[] = [];
  const sanitizedFiles: SanitizedFileForStrapi[] = [];
  const files = Array.isArray(rawFiles) ? rawFiles : [];
  const label = field.label || field.name;

  if (files.length === 0) {
    if (field.required) {
      const reqRule = (field.validation || []).find((v) => v.type === 'required');
      errors.push(reqRule?.message || `${label} is required`);
    }
    return { valid: errors.length === 0, errors, sanitizedFiles };
  }

  const maxFiles = resolveMaxFiles(field.multiple, field.maxFiles);
  if (!field.multiple && files.length > 1) {
    errors.push(`${label}: only 1 file is allowed`);
    return { valid: false, errors, sanitizedFiles };
  }
  if (files.length > maxFiles) {
    errors.push(`${label}: maximum ${maxFiles} files allowed`);
    return { valid: false, errors, sanitizedFiles };
  }

  const maxSizeMb = resolveMaxSizeMb(field.maxSizeMb);
  const maxBytes = Math.round(maxSizeMb * 1024 * 1024);
  const allowedExtensions = parseAllowedExtensions(field.accept);

  for (const rawFile of files) {
    const rawName = rawFile?.originalFilename || rawFile?.newFilename || '';
    const { displayName, storageName, ext, hasDangerousDoubleExtension } = sanitizeFilename(rawName);

    if (hasDangerousDoubleExtension) {
      errors.push(`${label}: file "${displayName}" has a disallowed double extension`);
      continue;
    }

    if (!ext || !Object.prototype.hasOwnProperty.call(SAFE_FILE_TYPES, ext)) {
      errors.push(`${label}: file type "${ext || 'unknown'}" is not permitted`);
      continue;
    }

    if (!allowedExtensions.includes(ext)) {
      errors.push(
        `${label}: file type "${ext}" is not allowed (accepted: ${allowedExtensions.join(', ')})`
      );
      continue;
    }

    const typeSpec = SAFE_FILE_TYPES[ext];
    const policyCheck = isAllowedByUploadSecurity(typeSpec.mime, ext, options?.uploadSecurity);
    if (!policyCheck.ok) {
      errors.push(`${label}: ${policyCheck.reason}`);
      continue;
    }

    const pathCheck = verifyTempFilePath(rawFile.filepath);
    if (!pathCheck.ok || !pathCheck.realPath || pathCheck.size === undefined) {
      errors.push(`${label}: ${pathCheck.reason || 'invalid upload file'}`);
      continue;
    }

    const actualSize = pathCheck.size;
    if (actualSize <= 0) {
      errors.push(`${label}: file "${displayName}" is empty`);
      continue;
    }

    if (actualSize > maxBytes) {
      errors.push(`${label}: file "${displayName}" exceeds maximum size of ${maxSizeMb} MB`);
      continue;
    }

    let buf: Buffer;
    try {
      buf = fs.readFileSync(pathCheck.realPath);
    } catch {
      errors.push(`${label}: could not read uploaded file "${displayName}"`);
      continue;
    }

    const verification = typeSpec.verify(buf, ext);
    if (!verification.ok) {
      errors.push(
        `${label}: file "${displayName}" failed content verification (${verification.reason || 'invalid content'})`
      );
      continue;
    }

    sanitizedFiles.push({
      filepath: pathCheck.realPath,
      originalFilename: storageName,
      displayName,
      mimetype: typeSpec.mime,
      detectedMimeType: typeSpec.mime,
      size: actualSize,
      ext,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFiles,
  };
}

/**
 * Safely delete temporary files created during a multipart request.
 */
export function cleanupTempFiles(filesByField: Record<string, RawUploadedFile[]>): void {
  if (!filesByField || typeof filesByField !== 'object') return;
  for (const list of Object.values(filesByField)) {
    if (!Array.isArray(list)) continue;
    for (const f of list) {
      if (!f?.filepath) continue;
      const check = verifyTempFilePath(f.filepath);
      if (check.ok && check.realPath) {
        try {
          fs.unlinkSync(check.realPath);
        } catch {
          // ignore if already removed
        }
      }
    }
  }
}

/**
 * Type guard checking if a submission value is an array of UploadedFileItem objects.
 */
export function isUploadedFileList(val: unknown): val is UploadedFileItem[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as UploadedFileItem).name === 'string' &&
        typeof (item as UploadedFileItem).url === 'string'
    )
  );
}

/**
 * Format an UploadedFileItem[] value into a readable string for CSV export.
 */
export function formatFileCellForCsv(val: unknown): string {
  if (!isUploadedFileList(val)) return String(val ?? '');
  return val.map((f) => `${f.name} (${f.url})`).join('; ');
}
