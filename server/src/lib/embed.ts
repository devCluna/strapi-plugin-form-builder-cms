/**
 * Pure helpers for the embed runtime. These are injected into the served embed
 * script via `.toString()`, so the browser runs the exact code covered by tests
 * here — no drift between the tested function and the shipped one. Keep them
 * self-contained (globals only, no imports) so the stringified source runs
 * standalone in the browser.
 */

/** Is a post-submit redirect target safe to navigate to (http/https/relative only)? */
export function isSafeRedirect(url: string, base: string): boolean {
  try {
    const u = new URL(url, base);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Normalize a field's `accept` string into a safe comma-separated extension list
 * matching `SAFE_EXTS`. Self-contained for `.toString()` injection into embed.js.
 */
export function resolveClientAccept(accept?: string): string {
  const SAFE_MAP: Record<string, { cat: string; mime: string }> = {
    '.pdf': { cat: 'document', mime: 'application/pdf' },
    '.png': { cat: 'image', mime: 'image/png' },
    '.jpg': { cat: 'image', mime: 'image/jpeg' },
    '.jpeg': { cat: 'image', mime: 'image/jpeg' },
    '.gif': { cat: 'image', mime: 'image/gif' },
    '.webp': { cat: 'image', mime: 'image/webp' },
    '.doc': { cat: 'document', mime: 'application/msword' },
    '.docx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    '.xls': { cat: 'document', mime: 'application/vnd.ms-excel' },
    '.xlsx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    '.ppt': { cat: 'document', mime: 'application/vnd.ms-powerpoint' },
    '.pptx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    '.odt': { cat: 'document', mime: 'application/vnd.oasis.opendocument.text' },
    '.ods': { cat: 'document', mime: 'application/vnd.oasis.opendocument.spreadsheet' },
    '.odp': { cat: 'document', mime: 'application/vnd.oasis.opendocument.presentation' },
    '.txt': { cat: 'document', mime: 'text/plain' },
    '.csv': { cat: 'document', mime: 'text/csv' },
    '.rtf': { cat: 'document', mime: 'application/rtf' },
    '.zip': { cat: 'archive', mime: 'application/zip' },
    '.mp3': { cat: 'audio', mime: 'audio/mpeg' },
    '.wav': { cat: 'audio', mime: 'audio/wav' },
    '.mp4': { cat: 'video', mime: 'video/mp4' },
  };
  const raw =
    typeof accept === 'string' && accept.trim().length > 0
      ? accept
      : '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';
  const tokens = raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const allowed: string[] = [];
  const allSafe = Object.keys(SAFE_MAP);
  for (const token of tokens) {
    if (token === '*' || token === '*/*') {
      allSafe.forEach((e) => {
        if (!allowed.includes(e)) allowed.push(e);
      });
    } else if (token === 'image/*' || token === 'audio/*' || token === 'video/*') {
      const cat = token.split('/')[0];
      allSafe.forEach((e) => {
        if (SAFE_MAP[e].cat === cat && !allowed.includes(e)) allowed.push(e);
      });
    } else if (token.indexOf('/') !== -1) {
      allSafe.forEach((e) => {
        if (SAFE_MAP[e].mime === token && !allowed.includes(e)) allowed.push(e);
      });
    } else {
      const ext = token.startsWith('.') ? token : '.' + token;
      if (Object.prototype.hasOwnProperty.call(SAFE_MAP, ext) && !allowed.includes(ext)) {
        allowed.push(ext);
      }
    }
  }
  return allowed.length > 0 ? allowed.join(',') : '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';
}

/**
 * Validate selected files for `file` fields on the client before submitting.
 * Self-contained (no imports) so it can be serialized into embed.js via `.toString()`.
 */
export function validateClientFiles(
  fields: Array<{
    type?: string;
    name: string;
    label?: string;
    required?: boolean;
    accept?: string;
    maxSizeMb?: number;
    multiple?: boolean;
    maxFiles?: number;
    validation?: Array<{ type: string; value?: any; message?: string }>;
  }>,
  filesByField: Record<string, Array<{ name: string; size: number; type?: string }>>
): Record<string, string[]> {
  const SAFE_EXTS: Record<string, { cat: string; mime: string }> = {
    '.pdf': { cat: 'document', mime: 'application/pdf' },
    '.png': { cat: 'image', mime: 'image/png' },
    '.jpg': { cat: 'image', mime: 'image/jpeg' },
    '.jpeg': { cat: 'image', mime: 'image/jpeg' },
    '.gif': { cat: 'image', mime: 'image/gif' },
    '.webp': { cat: 'image', mime: 'image/webp' },
    '.doc': { cat: 'document', mime: 'application/msword' },
    '.docx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    '.xls': { cat: 'document', mime: 'application/vnd.ms-excel' },
    '.xlsx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    '.ppt': { cat: 'document', mime: 'application/vnd.ms-powerpoint' },
    '.pptx': {
      cat: 'document',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    '.odt': { cat: 'document', mime: 'application/vnd.oasis.opendocument.text' },
    '.ods': { cat: 'document', mime: 'application/vnd.oasis.opendocument.spreadsheet' },
    '.odp': { cat: 'document', mime: 'application/vnd.oasis.opendocument.presentation' },
    '.txt': { cat: 'document', mime: 'text/plain' },
    '.csv': { cat: 'document', mime: 'text/csv' },
    '.rtf': { cat: 'document', mime: 'application/rtf' },
    '.zip': { cat: 'archive', mime: 'application/zip' },
    '.mp3': { cat: 'audio', mime: 'audio/mpeg' },
    '.wav': { cat: 'audio', mime: 'audio/wav' },
    '.mp4': { cat: 'video', mime: 'video/mp4' },
  };
  const errors: Record<string, string[]> = {};

  for (const field of fields || []) {
    if (!field || field.type !== 'file') continue;
    const label = field.label || field.name;
    const files =
      filesByField && Object.prototype.hasOwnProperty.call(filesByField, field.name)
        ? filesByField[field.name] || []
        : [];
    const fieldErrors: string[] = [];

    if (files.length === 0) {
      if (field.required) {
        const rules = Array.isArray(field.validation) ? field.validation : [];
        let reqMsg = '';
        for (let r = 0; r < rules.length; r++) {
          if (rules[r] && rules[r].type === 'required' && rules[r].message) {
            reqMsg = rules[r].message!;
            break;
          }
        }
        fieldErrors.push(reqMsg || label + ' is required');
      }
      if (fieldErrors.length > 0) errors[field.name] = fieldErrors;
      continue;
    }

    const rawMaxFiles = Math.floor(Number(field.maxFiles));
    const maxFiles = field.multiple
      ? Number.isFinite(rawMaxFiles) && rawMaxFiles >= 1
        ? Math.min(rawMaxFiles, 10)
        : 3
      : 1;
    if (!field.multiple && files.length > 1) {
      fieldErrors.push(label + ': only 1 file is allowed');
    } else if (files.length > maxFiles) {
      fieldErrors.push(label + ': maximum ' + maxFiles + ' files allowed');
    }

    const rawMaxMb = Number(field.maxSizeMb);
    const maxSizeMb =
      Number.isFinite(rawMaxMb) && rawMaxMb > 0 ? Math.min(Math.max(rawMaxMb, 0.1), 25) : 5;
    const maxBytes = Math.round(maxSizeMb * 1024 * 1024);

    const rawAccept =
      typeof field.accept === 'string' && field.accept.trim().length > 0
        ? field.accept
        : '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';
    const tokens = rawAccept
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const allowed: string[] = [];
    const allSafe = Object.keys(SAFE_EXTS);
    for (const token of tokens) {
      if (token === '*' || token === '*/*') {
        allSafe.forEach((e) => {
          if (!allowed.includes(e)) allowed.push(e);
        });
      } else if (token === 'image/*' || token === 'audio/*' || token === 'video/*') {
        const cat = token.split('/')[0];
        allSafe.forEach((e) => {
          if (SAFE_EXTS[e].cat === cat && !allowed.includes(e)) allowed.push(e);
        });
      } else if (token.indexOf('/') !== -1) {
        allSafe.forEach((e) => {
          if (SAFE_EXTS[e].mime === token && !allowed.includes(e)) allowed.push(e);
        });
      } else {
        const ext = token.startsWith('.') ? token : '.' + token;
        if (Object.prototype.hasOwnProperty.call(SAFE_EXTS, ext) && !allowed.includes(ext)) {
          allowed.push(ext);
        }
      }
    }
    if (allowed.length === 0) {
      allowed.push('.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx');
    }

    const DANGEROUS_INNER_EXT =
      /\.(?:php\d?|phtml|phar|exe|dll|bat|cmd|sh|bash|zsh|ps1|vbs|js|mjs|cjs|jsp|asp|aspx|py|rb|pl|cgi|htaccess|svg|html?|xhtml|ssi|wasm)\s*(?:\.|$)/i;

    for (const f of files) {
      const name = String(f.name || '').trim();
      const dotIdx = name.lastIndexOf('.');
      const ext = dotIdx > 0 ? name.slice(dotIdx).toLowerCase() : '';
      const stem = dotIdx > 0 ? name.slice(0, dotIdx) : name;
      if (DANGEROUS_INNER_EXT.test(stem) || /^(?:\.?)htaccess$/i.test(stem)) {
        fieldErrors.push(label + ': file "' + name + '" has a disallowed double extension');
        continue;
      }
      if (!ext || !Object.prototype.hasOwnProperty.call(SAFE_EXTS, ext) || !allowed.includes(ext)) {
        fieldErrors.push(label + ': file type "' + (ext || 'unknown') + '" is not allowed');
        continue;
      }
      if (!f.size || f.size <= 0) {
        fieldErrors.push(label + ': file "' + name + '" is empty');
      } else if (f.size > maxBytes) {
        fieldErrors.push(label + ': file "' + name + '" exceeds maximum size of ' + maxSizeMb + ' MB');
      }
    }

    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
  }

  return errors;
}

