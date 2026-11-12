import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseAllowedExtensions,
  resolveMaxSizeMb,
  resolveMaxFiles,
  sanitizeFilename,
  validateUploadedFilesForField,
  verifyTempFilePath,
  cleanupTempFiles,
  isAllowedByUploadSecurity,
  getUploadSecurityConfig,
  formatFileCellForCsv,
  isUploadedFileList,
  HARD_MAX_SIZE_MB,
  HARD_MAX_FILES,
} from '../server/src/lib/file-upload';
import { validateClientFiles, resolveClientAccept } from '../server/src/lib/embed';
import submissionServiceFactory, { verifyCaptcha } from '../server/src/services/submission';
import submissionController from '../server/src/controllers/submission';
import formController from '../server/src/controllers/form';
import validationFactory from '../server/src/services/validation';

import en from '../admin/src/translations/en.json';
import es from '../admin/src/translations/es.json';
import fr from '../admin/src/translations/fr.json';
import de from '../admin/src/translations/de.json';
import ar from '../admin/src/translations/ar.json';
import tr from '../admin/src/translations/tr.json';

const createdTempFiles: string[] = [];

function createTempFile(bytes: Buffer | string, prefix = 'sfb-test-'): string {
  const filePath = path.join(
    os.tmpdir(),
    `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  fs.writeFileSync(filePath, bytes);
  createdTempFiles.push(filePath);
  return filePath;
}

/** Build a valid 30-byte PKZIP local file header + entry name + payload */
function buildPkZipBuffer(entryName: string, content = 'hello'): Buffer {
  const nameBuf = Buffer.from(entryName, 'utf8');
  const dataBuf = Buffer.from(content, 'utf8');
  const header = Buffer.alloc(30);
  // PK\x03\x04
  header[0] = 0x50;
  header[1] = 0x4b;
  header[2] = 0x03;
  header[3] = 0x04;
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt32LE(dataBuf.length, 18); // compressed size
  header.writeUInt32LE(dataBuf.length, 22); // uncompressed size
  header.writeUInt16LE(nameBuf.length, 26); // file name length
  header.writeUInt16LE(0, 28); // extra field length
  return Buffer.concat([header, nameBuf, dataBuf]);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).strapi;
  while (createdTempFiles.length > 0) {
    const p = createdTempFiles.pop()!;
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
});

describe('file-upload: extension & parameter normalization', () => {
  it('strips dangerous extensions like .svg, .html, .exe, .js, .php and falls back to defaults if none remain', () => {
    const parsed = parseAllowedExtensions('.svg, .html, .exe, .js, .php, .pdf, .png');
    expect(parsed).toEqual(['.pdf', '.png']);

    const fallback = parseAllowedExtensions('.svg, .html, .exe');
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback).not.toContain('.svg');
    expect(fallback).not.toContain('.html');
  });

  it('clamps maxSizeMb and maxFiles within safe hard bounds', () => {
    expect(resolveMaxSizeMb(undefined)).toBe(5);
    expect(resolveMaxSizeMb(-10)).toBe(5);
    expect(resolveMaxSizeMb(0.01)).toBe(0.1);
    expect(resolveMaxSizeMb(999)).toBe(HARD_MAX_SIZE_MB);
    expect(resolveMaxFiles(false, 5)).toBe(1);
    expect(resolveMaxFiles(true, undefined)).toBe(3);
    expect(resolveMaxFiles(true, 999)).toBe(HARD_MAX_FILES);
  });
});

describe('file-upload: sanitizeFilename', () => {
  it('strips directory traversal paths and generates a UUID-suffixed storage name', () => {
    const res = sanitizeFilename('../../etc/passwd/my_resume.pdf');
    expect(res.displayName).toBe('my_resume.pdf');
    expect(res.ext).toBe('.pdf');
    expect(res.hasDangerousDoubleExtension).toBe(false);
    expect(res.storageName).toMatch(/^my_resume-[0-9a-f]{8}\.pdf$/);
  });

  it('detects double extensions with dangerous inner extensions (e.g. shell.php.jpg, xss.svg.png)', () => {
    expect(sanitizeFilename('shell.php.jpg').hasDangerousDoubleExtension).toBe(true);
    expect(sanitizeFilename('xss.svg.png').hasDangerousDoubleExtension).toBe(true);
    expect(sanitizeFilename('dropper.exe.pdf').hasDangerousDoubleExtension).toBe(true);
  });

  it('rewrites Windows reserved device names (CON, NUL, COM1, LPT1) to a safe stem', () => {
    expect(sanitizeFilename('CON.pdf').displayName).toBe('file.pdf');
    expect(sanitizeFilename('nul.png').displayName).toBe('file.png');
    expect(sanitizeFilename('LPT1.docx').displayName).toBe('file.docx');
  });
});

describe('file-upload: binary magic-byte & active content verification', () => {
  const pdfField = {
    name: 'resume',
    label: 'Resume',
    required: true,
    accept: '.pdf,.png,.jpg,.webp,.zip,.docx,.txt,.csv,.rtf',
    maxSizeMb: 2,
    multiple: false,
    maxFiles: 1,
  };

  it('accepts a valid PDF and assigns canonical application/pdf MIME type', () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'latin1');
    const filepath = createTempFile(validPdf);
    const res = validateUploadedFilesForField(pdfField, [
      { filepath, originalFilename: 'candidate-cv.pdf', mimetype: 'application/octet-stream', size: validPdf.length },
    ]);
    expect(res.valid).toBe(true);
    expect(res.sanitizedFiles).toHaveLength(1);
    expect(res.sanitizedFiles[0].mimetype).toBe('application/pdf');
    expect(res.sanitizedFiles[0].displayName).toBe('candidate-cv.pdf');
  });

  it('accepts a valid PNG with authentic magic bytes', () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const filepath = createTempFile(validPng);
    const res = validateUploadedFilesForField(pdfField, [
      { filepath, originalFilename: 'photo.png', mimetype: 'image/png', size: validPng.length },
    ]);
    expect(res.valid).toBe(true);
    expect(res.sanitizedFiles[0].mimetype).toBe('image/png');
  });

  it('accepts a valid ZIP archive with safe entry paths', () => {
    const validZip = buildPkZipBuffer('docs/readme.txt', 'Hello world');
    const filepath = createTempFile(validZip);
    const res = validateUploadedFilesForField(pdfField, [
      { filepath, originalFilename: 'bundle.zip', mimetype: 'application/zip', size: validZip.length },
    ]);
    expect(res.valid).toBe(true);
    expect(res.sanitizedFiles[0].mimetype).toBe('application/zip');
  });

  it('rejects an executable or HTML file renamed to .pdf or .png (extension spoofing)', () => {
    const exeBytes = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff', 'latin1');
    const exePath = createTempFile(exeBytes);
    const r1 = validateUploadedFilesForField(pdfField, [
      { filepath: exePath, originalFilename: 'invoice.pdf', mimetype: 'application/pdf', size: exeBytes.length },
    ]);
    expect(r1.valid).toBe(false);
    expect(r1.errors[0]).toContain('Invalid PDF header signature');

    const htmlBytes = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>', 'utf8');
    const htmlPath = createTempFile(htmlBytes);
    const r2 = validateUploadedFilesForField(pdfField, [
      { filepath: htmlPath, originalFilename: 'image.png', mimetype: 'image/png', size: htmlBytes.length },
    ]);
    expect(r2.valid).toBe(false);
    expect(r2.errors[0]).toContain('Invalid PNG signature');
  });

  it('rejects a PDF containing embedded /JavaScript or /Launch actions', () => {
    const maliciousPdf = Buffer.from(
      '%PDF-1.7\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert(1)) >>\nendobj\n%%EOF',
      'latin1'
    );
    const filepath = createTempFile(maliciousPdf);
    const res = validateUploadedFilesForField(pdfField, [
      { filepath, originalFilename: 'evil.pdf', mimetype: 'application/pdf', size: maliciousPdf.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('disallowed active or script actions');
  });

  it('rejects a ZIP/DOCX containing path traversal (ZIP Slip), VBA macros, or invalid OOXML structure', () => {
    // 1. ZIP Slip with ../../evil.sh entry name
    const zipSlip = buildPkZipBuffer('../../evil.sh', '#!/bin/sh\n');
    const p1 = createTempFile(zipSlip);
    const r1 = validateUploadedFilesForField(pdfField, [
      { filepath: p1, originalFilename: 'archive.zip', mimetype: 'application/zip', size: zipSlip.length },
    ]);
    expect(r1.valid).toBe(false);
    expect(r1.errors[0]).toContain('path traversal');

    // 2. DOCX with word/vbaProject.bin macro payload
    const macroDocx = buildPkZipBuffer('word/vbaProject.bin', 'VBA');
    const p2 = createTempFile(macroDocx);
    const r2 = validateUploadedFilesForField(pdfField, [
      {
        filepath: p2,
        originalFilename: 'resume.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: macroDocx.length,
      },
    ]);
    expect(r2.valid).toBe(false);
    expect(r2.errors[0]).toContain('macros');

    // 3. Plain ZIP disguised as .docx without [Content_Types].xml is rejected; valid OOXML passes
    const plainZipAsDocx = buildPkZipBuffer('payload.txt', 'hello');
    const p3 = createTempFile(plainZipAsDocx);
    const r3 = validateUploadedFilesForField(pdfField, [
      {
        filepath: p3,
        originalFilename: 'disguised.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: plainZipAsDocx.length,
      },
    ]);
    expect(r3.valid).toBe(false);
    expect(r3.errors[0]).toContain('Office XML package structure');

    const validDocx = Buffer.concat([
      buildPkZipBuffer('[Content_Types].xml', '<Types/>'),
      buildPkZipBuffer('word/document.xml', '<w:document/>'),
    ]);
    const p4 = createTempFile(validDocx);
    const r4 = validateUploadedFilesForField(pdfField, [
      {
        filepath: p4,
        originalFilename: 'resume.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: validDocx.length,
      },
    ]);
    expect(r4.valid).toBe(true);
  });

  it('rejects CSV files with spreadsheet formula injection payloads', () => {
    const csvPayload = Buffer.from('name,score\n=CMD|\' /C calc\'!A0,100\n', 'utf8');
    const filepath = createTempFile(csvPayload);
    const res = validateUploadedFilesForField(pdfField, [
      { filepath, originalFilename: 'contacts.csv', mimetype: 'text/csv', size: csvPayload.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('spreadsheet formulas');
  });

  it('rejects plain text files that disguise HTML/SVG or shell scripts', () => {
    const svgText = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', 'utf8');
    const p1 = createTempFile(svgText);
    expect(
      validateUploadedFilesForField(pdfField, [
        { filepath: p1, originalFilename: 'notes.txt', mimetype: 'text/plain', size: svgText.length },
      ]).valid
    ).toBe(false);

    const shebangText = Buffer.from('#!/bin/bash\nrm -rf /\n', 'utf8');
    const p2 = createTempFile(shebangText);
    expect(
      validateUploadedFilesForField(pdfField, [
        { filepath: p2, originalFilename: 'notes.txt', mimetype: 'text/plain', size: shebangText.length },
      ]).valid
    ).toBe(false);
  });

  it('enforces maxSizeMb and single/multiple file count constraints', () => {
    const smallField = { ...pdfField, maxSizeMb: 1, multiple: false, maxFiles: 1 };
    const oversizedPdf = Buffer.alloc(1024 * 1024 + 500, 0x20);
    oversizedPdf.write('%PDF-1.7\n');
    const p1 = createTempFile(oversizedPdf);

    const rSize = validateUploadedFilesForField(smallField, [
      { filepath: p1, originalFilename: 'big.pdf', mimetype: 'application/pdf', size: oversizedPdf.length },
    ]);
    expect(rSize.valid).toBe(false);
    expect(rSize.errors[0]).toContain('exceeds maximum size of 1 MB');

    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const p2 = createTempFile(validPdf);
    const rCount = validateUploadedFilesForField(smallField, [
      { filepath: p2, originalFilename: 'one.pdf', size: validPdf.length },
      { filepath: p2, originalFilename: 'two.pdf', size: validPdf.length },
    ]);
    expect(rCount.valid).toBe(false);
    expect(rCount.errors[0]).toContain('only 1 file is allowed');
  });

  it('rejects symlinks inside os.tmpdir()', () => {
    const validPdf = Buffer.from('%PDF-1.7\n%%EOF', 'latin1');
    const targetPath = createTempFile(validPdf);
    const symlinkPath = path.join(os.tmpdir(), `sfb-symlink-${Date.now()}.pdf`);
    fs.symlinkSync(targetPath, symlinkPath);
    createdTempFiles.push(symlinkPath);

    const res = validateUploadedFilesForField(pdfField, [
      { filepath: symlinkPath, originalFilename: 'linked.pdf', size: validPdf.length },
    ]);
    expect(res.valid).toBe(false);
  });
});

describe('embed.validateClientFiles (browser-side parity)', () => {
  const fields = [
    { name: 'cv', label: 'CV', type: 'file', required: true, accept: '.pdf,.png', maxSizeMb: 2, multiple: false, maxFiles: 1 },
  ];

  it('flags missing required file, disallowed extension, double extension, and oversized file', () => {
    expect(validateClientFiles(fields, {})).toEqual({ cv: ['CV is required'] });
    expect(
      validateClientFiles(fields, { cv: [{ name: 'bad.exe', size: 100 }] }).cv[0]
    ).toContain('not allowed');
    expect(
      validateClientFiles(fields, { cv: [{ name: 'shell.php.png', size: 100 }] }).cv[0]
    ).toContain('double extension');
    expect(
      validateClientFiles(fields, { cv: [{ name: 'good.pdf', size: 3 * 1024 * 1024 }] }).cv[0]
    ).toContain('exceeds maximum size of 2 MB');
    expect(
      validateClientFiles(fields, { cv: [{ name: 'good.pdf', size: 1024 }] })
    ).toEqual({});
  });
});

describe('submission controller & service end-to-end security', () => {
  function createMockStrapi(overrides: any = {}) {
    const formRecord = {
      id: 10,
      slug: 'job-apply',
      publishedAt: '2026-01-01T00:00:00.000Z',
      publishedData: {
        title: 'Job Application',
        fields: [
          { id: 'f1', type: 'text', name: 'fullName', label: 'Full Name', required: true },
          { id: 'f2', type: 'file', name: 'resume', label: 'Resume', required: true, accept: '.pdf', maxSizeMb: 5, multiple: false, maxFiles: 1 },
        ],
        settings: {
          enableHoneypot: true,
          enableRateLimit: true,
          maxSubmissionsPerHour: 5,
          ...(overrides.settings || {}),
        },
      },
    };

    const uploadFn = vi.fn(async ({ files }) => [
      {
        id: 42,
        name: files.originalFilename || files.name,
        url: '/uploads/uuid_resume.pdf',
        mime: files.mimetype || 'application/pdf',
        size: 1.25,
        ext: '.pdf',
      },
    ]);
    const removeFn = vi.fn(async () => {});
    const createSubFn = vi.fn(async ({ data }) => ({ id: 99, ...data }));
    const countSubFn = vi.fn(async () => overrides.recentCount ?? 0);

    const strapi: any = {
      log: { error: vi.fn() },
      plugin: (name: string) => {
        if (name === 'strapi-plugin-form-builder-cms') {
          return {
            service: (svcName: string) => {
              if (svcName === 'form') {
                return { findBySlug: vi.fn(async () => formRecord) };
              }
              if (svcName === 'validation') {
                return validationFactory();
              }
              if (svcName === 'submission') {
                return submissionServiceFactory({ strapi });
              }
              return {};
            },
          };
        }
        if (name === 'upload') {
          return {
            service: (svcName: string) => {
              if (svcName === 'upload') return { upload: uploadFn, remove: removeFn };
              if (svcName === 'api-upload-folder') return { getAPIUploadFolder: async () => ({ id: 7 }) };
              return {};
            },
          };
        }
        return {};
      },
      db: {
        query: () => ({
          count: countSubFn,
          create: overrides.createSubFn || createSubFn,
          findMany: vi.fn(async () => overrides.submissions || []),
        }),
      },
    };

    (globalThis as any).strapi = strapi;
    return { strapi, uploadFn, removeFn, createSubFn };
  }

  it('prevents JSON spoofing of file fields (ignores fake file metadata sent in JSON body)', async () => {
    const { strapi, uploadFn } = createMockStrapi();
    const svc = submissionServiceFactory({ strapi });

    let caught: any = null;
    try {
      await svc.submit(
        'job-apply',
        {
          fullName: 'Alice',
          resume: [{ id: 1, name: 'fake.pdf', url: 'javascript:alert(1)', mime: 'application/pdf', size: 100 }],
        },
        { ip: '127.0.0.1', userAgent: 'Vitest' }
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeTruthy();
    expect(caught.name).toBe('ValidationError');
    expect(caught.details?.resume).toEqual(['Resume is required']);
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it('never uploads files to Media Library when non-file validation, rate-limit, or honeypot fails', async () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const filepath = createTempFile(validPdf);

    // 1. Missing required text field fullName
    const { strapi, uploadFn } = createMockStrapi();
    const svc = submissionServiceFactory({ strapi });
    await expect(
      svc.submit(
        'job-apply',
        { fullName: '' },
        { ip: '127.0.0.1', userAgent: 'Vitest' },
        { resume: [{ filepath, originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: validPdf.length }] }
      )
    ).rejects.toThrow('Validation failed');
    expect(uploadFn).not.toHaveBeenCalled();

    // 2. Honeypot triggered (_fc_hp filled)
    const r2 = await svc.submit(
      'job-apply',
      { fullName: 'Bot', _fc_hp: 'filled-by-bot' },
      { ip: '127.0.0.1', userAgent: 'Vitest' },
      { resume: [{ filepath, originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: validPdf.length }] }
    );
    expect(r2.success).toBe(true);
    expect(uploadFn).not.toHaveBeenCalled();

    // 3. Rate limit exceeded
    const { strapi: rlStrapi, uploadFn: rlUploadFn } = createMockStrapi({ recentCount: 5 });
    const rlSvc = submissionServiceFactory({ strapi: rlStrapi });
    await expect(
      rlSvc.submit(
        'job-apply',
        { fullName: 'Alice' },
        { ip: '127.0.0.1', userAgent: 'Vitest' },
        { resume: [{ filepath, originalFilename: 'cv.pdf', mimetype: 'application/pdf', size: validPdf.length }] }
      )
    ).rejects.toThrow('Too many submissions');
    expect(rlUploadFn).not.toHaveBeenCalled();
  });

  it('uploads valid files to the API Uploads folder, stores metadata, and cleans up temp files via controller', async () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const filepath = createTempFile(validPdf);
    const { uploadFn, createSubFn } = createMockStrapi();

    const ctx: any = {
      params: { slug: 'job-apply' },
      request: {
        body: { data: JSON.stringify({ fullName: 'Alice' }) },
        files: {
          'files.resume': {
            filepath,
            originalFilename: 'alice_cv.pdf',
            mimetype: 'application/pdf',
            size: validPdf.length,
          },
        },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Vitest' },
      },
      ip: '127.0.0.1',
      badRequest: vi.fn((msg) => ({ status: 400, msg })),
      status: 200,
      body: null,
    };

    await submissionController.submit(ctx);

    expect(ctx.body?.success).toBe(true);
    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(uploadFn.mock.calls[0][0].data.fileInfo.folder).toBe(7);
    expect(createSubFn).toHaveBeenCalledTimes(1);
    const savedData = createSubFn.mock.calls[0][0].data.data;
    expect(savedData.fullName).toBe('Alice');
    expect(isUploadedFileList(savedData.resume)).toBe(true);
    expect(savedData.resume[0]).toMatchObject({
      id: 42,
      name: 'alice_cv.pdf',
      url: '/uploads/uuid_resume.pdf',
      mime: 'application/pdf',
    });

    // Temp file must be deleted by controller finally block
    expect(fs.existsSync(filepath)).toBe(false);
  });

  it('rolls back uploaded Media Library records if submission DB creation fails', async () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const filepath = createTempFile(validPdf);
    const { strapi, uploadFn, removeFn } = createMockStrapi({
      createSubFn: vi.fn(async () => {
        throw new Error('DB connection lost');
      }),
    });
    const svc = submissionServiceFactory({ strapi });

    await expect(
      svc.submit(
        'job-apply',
        { fullName: 'Alice' },
        { ip: '127.0.0.1', userAgent: 'Vitest' },
        { resume: [{ filepath, originalFilename: 'alice_cv.pdf', mimetype: 'application/pdf', size: validPdf.length }] }
      )
    ).rejects.toThrow('DB connection lost');

    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(removeFn).toHaveBeenCalledTimes(1);
    expect(removeFn).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
  });

  it('formats UploadedFileItem[] cleanly in CSV export', () => {
    const formatted = formatFileCellForCsv([
      { id: 1, name: 'alice_cv.pdf', url: '/uploads/alice_cv.pdf', mime: 'application/pdf', size: 1024 },
      { id: 2, name: 'portfolio.png', url: 'https://cdn.example.com/p.png', mime: 'image/png', size: 2048 },
    ]);
    expect(formatted).toBe('alice_cv.pdf (/uploads/alice_cv.pdf); portfolio.png (https://cdn.example.com/p.png)');
  });

  it('cleans up temp files even when uploaded under unsafe/malformed keys and prevents Object.prototype key collisions (toString/valueOf)', async () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const leakedPath1 = createTempFile(validPdf, 'sfb-leak-proto-');
    const leakedPath2 = createTempFile(validPdf, 'sfb-leak-tostring-');
    const leakedPath3 = createTempFile(validPdf, 'sfb-leak-empty-');
    createMockStrapi();

    const ctx: any = {
      params: { slug: 'job-apply' },
      request: {
        body: {
          data: JSON.stringify({
            fullName: 'Alice',
            'toString[]': 'evil1',
            valueOf: 'evil2',
            'valueOf[]': 'evil3',
          }),
        },
        files: {
          'files.__proto__': { filepath: leakedPath1, originalFilename: 'a.pdf', size: validPdf.length },
          'files.toString': { filepath: leakedPath2, originalFilename: 'b.pdf', size: validPdf.length },
          'files.': { filepath: leakedPath3, originalFilename: 'c.pdf', size: validPdf.length },
        },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Vitest' },
      },
      ip: '127.0.0.1',
      badRequest: vi.fn((msg) => ({ status: 400, msg })),
      status: 200,
      body: null,
    };

    await submissionController.submit(ctx);

    // Must return 400 ValidationError (not 500 TypeError) and unlink all 3 temp files
    expect(ctx.status).toBe(400);
    expect(fs.existsSync(leakedPath1)).toBe(false);
    expect(fs.existsSync(leakedPath2)).toBe(false);
    expect(fs.existsSync(leakedPath3)).toBe(false);
  });
});

describe('adversarial red-team regression suite', () => {
  const field = {
    type: 'file',
    name: 'upload',
    label: 'Attachment',
    required: true,
    accept: '.pdf,.png,.zip,.docx,.csv',
    maxSizeMb: 5,
    multiple: false,
    maxFiles: 1,
    validation: [{ type: 'required', message: 'Please attach your document' }],
  };

  it('catches PKZIP header-skip attack where Entry 1 payload contains a fake PK\\x03\\x04 with large extraLen before Entry 2 Zip Slip', () => {
    // Entry 1 payload contains a fake PK\x03\x04 header with extraLen = 5000 intended to jump over Entry 2
    const fakeInnerHeader = Buffer.alloc(36, 0x41);
    fakeInnerHeader[0] = 0x50;
    fakeInnerHeader[1] = 0x4b;
    fakeInnerHeader[2] = 0x03;
    fakeInnerHeader[3] = 0x04;
    fakeInnerHeader.writeUInt16LE(4, 26); // nameLen = 4 ("AAAA")
    fakeInnerHeader.writeUInt16LE(5000, 28); // huge extraLen to try to skip Entry 2

    const entry1 = buildPkZipBuffer('safe.txt', fakeInnerHeader.toString('latin1'));
    const entry2 = buildPkZipBuffer('../../pwned.sh', 'echo pwned');
    const combined = Buffer.concat([entry1, entry2]);

    const p = createTempFile(combined);
    const res = validateUploadedFilesForField(field, [
      { filepath: p, originalFilename: 'tricky.zip', size: combined.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('path traversal');
  });

  it('does not false-positive reject a valid ZIP whose compressed stream coincidentally contains PK\\x03\\x04 bytes with binary/zero nameLen', () => {
    const coincidentalBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0xff, 0xff]);
    const validEntry = buildPkZipBuffer('report.txt', 'hello');
    const combined = Buffer.concat([validEntry, coincidentalBytes, Buffer.alloc(40, 0x00)]);
    const p = createTempFile(combined);
    const res = validateUploadedFilesForField(field, [
      { filepath: p, originalFilename: 'valid.zip', size: combined.length },
    ]);
    expect(res.valid).toBe(true);
  });

  it('rejects PDF with hex-escaped /#4aavaScript or /#4A#53 action names', () => {
    const hexPdf = Buffer.from(
      '%PDF-1.7\n1 0 obj\n<< /Type /Action /S /#4aavaScript /#4A#53 (app.alert(1)) >>\nendobj\n%%EOF',
      'latin1'
    );
    const p = createTempFile(hexPdf);
    const res = validateUploadedFilesForField(field, [
      { filepath: p, originalFilename: 'hex.pdf', size: hexPdf.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('disallowed active or script actions');
  });

  it('rejects CSV with double-quoted formulas or UTF-8 BOM formula prefixes', () => {
    const quotedCsv = Buffer.from('name,cmd\n"Alice","=CMD|\' /C calc\'!A0"\n', 'utf8');
    const p1 = createTempFile(quotedCsv);
    expect(
      validateUploadedFilesForField(field, [
        { filepath: p1, originalFilename: 'quoted.csv', size: quotedCsv.length },
      ]).valid
    ).toBe(false);

    const bomCsv = Buffer.from('\uFEFF=SUM(1+1),foo\n', 'utf8');
    const p2 = createTempFile(bomCsv);
    expect(
      validateUploadedFilesForField(field, [
        { filepath: p2, originalFilename: 'bom.csv', size: bomCsv.length },
      ]).valid
    ).toBe(false);
  });

  it('rejects PNG/JPEG polyglot images containing embedded <?php or <script> tags', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const phpPayload = Buffer.from('<?php system($_GET["cmd"]); ?>', 'latin1');
    const polyglot = Buffer.concat([pngHeader, phpPayload]);
    const p = createTempFile(polyglot);
    const res = validateUploadedFilesForField(field, [
      { filepath: p, originalFilename: 'avatar.png', size: polyglot.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('embedded script or markup');
  });

  it('rejects multi-dot and trailing-space double extensions (shell.php.en.jpg, shell.php .jpg) on both server and client', () => {
    expect(sanitizeFilename('shell.php.en.jpg').hasDangerousDoubleExtension).toBe(true);
    expect(sanitizeFilename('shell.php .jpg').hasDangerousDoubleExtension).toBe(true);
    expect(
      validateClientFiles([field], { upload: [{ name: 'shell.php.en.png', size: 100 }] }).upload[0]
    ).toContain('double extension');
  });

  it('honors custom required validation message on both server and client', () => {
    const serverRes = validateUploadedFilesForField(field, []);
    expect(serverRes.valid).toBe(false);
    expect(serverRes.errors).toEqual(['Please attach your document']);

    const clientRes = validateClientFiles([field], {});
    expect(clientRes).toEqual({ upload: ['Please attach your document'] });
  });
});

describe('i18n parity for file upload translations across all 6 locales', () => {
  const locales = { en, es, fr, de, ar, tr };
  const requiredNewKeys = [
    'templates.application.resume',
    'field.file',
    'fieldSettings.file.accept',
    'fieldSettings.file.acceptHint',
    'fieldSettings.file.presetDocs',
    'fieldSettings.file.presetImages',
    'fieldSettings.file.presetSheets',
    'fieldSettings.file.presetDefault',
    'fieldSettings.file.maxSizeMb',
    'fieldSettings.file.maxSizeMbHint',
    'fieldSettings.file.multiple',
    'fieldSettings.file.maxFiles',
    'preview.fileConstraintSingle',
    'preview.fileConstraintMultiple',
  ];

  it('includes all 14 file-upload translation keys in en, es, fr, de, ar, and tr', () => {
    for (const [code, dict] of Object.entries(locales)) {
      for (const k of requiredNewKeys) {
        expect((dict as Record<string, string>)[k], `Missing ${k} in ${code}.json`).toBeTruthy();
      }
    }
  });

  it('aligns preview.fileConstraint* placeholders ({size}, {count}) across all 6 locales', () => {
    for (const [code, dict] of Object.entries(locales)) {
      const d = dict as Record<string, string>;
      expect(d['preview.fileConstraintSingle'], `${code} single`).toContain('{size}');
      expect(d['preview.fileConstraintSingle'], `${code} single`).not.toMatch(/\{(?:accept|maxSizeMb|maxFiles)\}/);
      expect(d['preview.fileConstraintMultiple'], `${code} multiple`).toContain('{size}');
      expect(d['preview.fileConstraintMultiple'], `${code} multiple`).toContain('{count}');
      expect(d['preview.fileConstraintMultiple'], `${code} multiple`).not.toMatch(/\{(?:accept|maxSizeMb|maxFiles)\}/);
    }
  });
});

describe('hardening & regression fixes', () => {
  const customDir = path.join(process.cwd(), '.tmp-custom-upload-test');

  afterEach(() => {
    try {
      fs.rmSync(customDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('accepts and cleans up temp files from a custom formidable.uploadDir outside os.tmpdir()', () => {
    fs.mkdirSync(customDir, { recursive: true });
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const customPath = path.join(customDir, `upload-${Date.now()}.pdf`);
    fs.writeFileSync(customPath, validPdf);

    const check = verifyTempFilePath(customPath);
    expect(check.ok).toBe(true);
    expect(check.size).toBe(validPdf.length);

    cleanupTempFiles({ files: [{ filepath: customPath }] });
    expect(fs.existsSync(customPath)).toBe(false);
  });

  it('detects UTF-16LE _VBA_PROJECT streams in OLE2 (.doc/.xls/.ppt) files and allows clean OLE2', () => {
    const ole2Header = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    const docField = { name: 'doc', label: 'Doc', accept: '.doc,.xls,.ppt', maxSizeMb: 5 };

    const cleanPath = createTempFile(ole2Header);
    expect(
      validateUploadedFilesForField(docField, [
        { filepath: cleanPath, originalFilename: 'clean.doc', size: ole2Header.length },
      ]).valid
    ).toBe(true);

    const utf16Macro = Buffer.concat([ole2Header, Buffer.from('_VBA_PROJECT', 'utf16le')]);
    const macroPath = createTempFile(utf16Macro);
    const res = validateUploadedFilesForField(docField, [
      { filepath: macroPath, originalFilename: 'macro.doc', size: utf16Macro.length },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('macros');
  });

  it('enforces host plugin::upload.security allowedTypes and deniedTypes in submission service', async () => {
    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF', 'latin1');
    const filepath = createTempFile(validPdf);

    const uploadFn = vi.fn(async () => [{ id: 1, url: '/uploads/a.pdf', mime: 'application/pdf' }]);
    const createSubFn = vi.fn(async ({ data }) => ({ id: 1, ...data }));
    const strapiWithPolicy = (security: any): any => ({
      config: {
        get: (key: any, def?: any) => {
          if (Array.isArray(key) && key[0] === 'plugin::upload' && key[1] === 'security') return security;
          return def;
        },
      },
      plugin: (name: string) => {
        if (name === 'strapi-plugin-form-builder-cms') {
          return {
            service: (svc: string) => {
              if (svc === 'form') {
                return {
                  findBySlug: vi.fn(async () => ({
                    id: 1,
                    slug: 'docs',
                    publishedAt: '2026-01-01T00:00:00.000Z',
                    publishedData: {
                      fields: [
                        { id: 'f1', type: 'file', name: 'doc', label: 'Doc', required: true, accept: '.pdf,.png,.docx' },
                      ],
                      settings: {},
                    },
                  })),
                };
              }
              if (svc === 'validation') return validationFactory();
              return {};
            },
          };
        }
        if (name === 'upload') {
          return {
            service: (svc: string) => (svc === 'upload' ? { upload: uploadFn, remove: vi.fn() } : {}),
          };
        }
        return {};
      },
      db: {
        query: () => ({ count: vi.fn(async () => 0), create: createSubFn }),
      },
    });

    // Denied by allowedTypes: ['image/*']
    const svc1 = submissionServiceFactory({ strapi: strapiWithPolicy({ allowedTypes: ['image/*'] }) });
    await expect(
      svc1.submit('docs', {}, { ip: '127.0.0.1', userAgent: 'Vitest' }, {
        doc: [{ filepath, originalFilename: 'cv.pdf', size: validPdf.length }],
      })
    ).rejects.toThrow('Validation failed');
    expect(uploadFn).not.toHaveBeenCalled();

    // Denied by deniedTypes: ['application/pdf']
    const svc2 = submissionServiceFactory({ strapi: strapiWithPolicy({ deniedTypes: ['application/pdf'] }) });
    await expect(
      svc2.submit('docs', {}, { ip: '127.0.0.1', userAgent: 'Vitest' }, {
        doc: [{ filepath, originalFilename: 'cv.pdf', size: validPdf.length }],
      })
    ).rejects.toThrow('Validation failed');
    expect(uploadFn).not.toHaveBeenCalled();

    // Direct helper checks: empty allowedTypes denies all; application/zip deny blocks .docx
    expect(isAllowedByUploadSecurity('image/png', '.png', { allowedTypes: [] }).ok).toBe(false);
    expect(
      isAllowedByUploadSecurity(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.docx',
        { deniedTypes: ['application/zip'] }
      ).ok
    ).toBe(false);
    expect(getUploadSecurityConfig(strapiWithPolicy({ allowedTypes: ['image/*'] }))).toEqual({
      allowedTypes: ['image/*'],
    });
  });

  it('strips undeclared submission keys and prevents attachment spoofing in CSV export', async () => {
    const createSubFn = vi.fn(async ({ data }) => ({ id: 1, ...data }));
    const mockForm = {
      id: 1,
      slug: 'contact',
      publishedAt: '2026-01-01T00:00:00.000Z',
      fields: [
        { id: 'f1', type: 'text', name: 'name', label: 'Name', required: true },
        { id: 'f2', type: 'file', name: 'cv', label: 'CV', required: false },
      ],
      publishedData: {
        fields: [
          { id: 'f1', type: 'text', name: 'name', label: 'Name', required: true },
          { id: 'f2', type: 'file', name: 'cv', label: 'CV', required: false },
        ],
        settings: {},
      },
    };
    const mockStrapi: any = {
      plugin: (n: string) =>
        n === 'strapi-plugin-form-builder-cms'
          ? {
              service: (s: string) =>
                s === 'form'
                  ? { findBySlug: vi.fn(async () => mockForm) }
                  : s === 'validation'
                    ? validationFactory()
                    : {},
            }
          : {},
      db: {
        query: () => ({
          findOne: vi.fn(async () => mockForm),
          create: createSubFn,
          findMany: vi.fn(async () => [
            {
              id: 5,
              status: 'new',
              createdAt: '2026-01-01',
              fields: [{ name: 'name', type: 'text' }],
              data: {
                name: [{ name: 'phish.pdf', url: 'https://evil.example/login' }],
              },
            },
          ]),
        }),
      },
    };

    const svc = submissionServiceFactory({ strapi: mockStrapi });
    await svc.submit(
      'contact',
      {
        name: 'Alice',
        forgedKey: [{ name: 'evil.pdf', url: 'https://evil.example' }],
      },
      { ip: '127.0.0.1', userAgent: 'Vitest' }
    );
    const saved = createSubFn.mock.calls[0][0].data.data;
    expect(saved.name).toBe('Alice');
    expect('forgedKey' in saved).toBe(false);

    const csv = await svc.export(1, 'csv');
    expect(csv).not.toContain('phish.pdf (https://evil.example/login)');
  });

  it('allows legitimate PDFs with /URI (.../js) links, single-ext js.pdf filenames, signed numbers in CSV, and rejects numeric CSV formulas & RTF DDE', () => {
    const field = { name: 'doc', label: 'Doc', accept: '.pdf,.csv,.rtf', maxSizeMb: 5 };

    // PDF with GitHub /js link in /URI annotation should pass
    const pdfWithUri = Buffer.from(
      '%PDF-1.7\n1 0 obj\n<< /Type /Annot /A << /S /URI /URI (https://github.com/user/js) >> >>\nendobj\n%%EOF',
      'latin1'
    );
    const p1 = createTempFile(pdfWithUri);
    expect(
      validateUploadedFilesForField(field, [
        { filepath: p1, originalFilename: 'js.pdf', size: pdfWithUri.length },
      ]).valid
    ).toBe(true);
    expect(sanitizeFilename('js.pdf').hasDangerousDoubleExtension).toBe(false);
    expect(validateClientFiles([field], { doc: [{ name: 'js.pdf', size: 100 }] })).toEqual({});

    // CSV: signed numbers (-42, +3.14) allowed; +1+CMD formula rejected; large newline CSV completes fast (no ReDoS)
    const safeCsv = Buffer.from('item,delta\nA,-42\nB,+3.14\n', 'utf8');
    const p2 = createTempFile(safeCsv);
    expect(
      validateUploadedFilesForField(field, [{ filepath: p2, originalFilename: 'nums.csv', size: safeCsv.length }])
        .valid
    ).toBe(true);

    const numericFormulaCsv = Buffer.from('item,cmd\nA,+1+cmd|\'/C calc\'!A0\n', 'utf8');
    const p3 = createTempFile(numericFormulaCsv);
    expect(
      validateUploadedFilesForField(field, [
        { filepath: p3, originalFilename: 'calc.csv', size: numericFormulaCsv.length },
      ]).valid
    ).toBe(false);

    const redosCsv = Buffer.from('\n\t'.repeat(50000) + 'safe', 'utf8');
    const p4 = createTempFile(redosCsv);
    const start = Date.now();
    expect(
      validateUploadedFilesForField(field, [{ filepath: p4, originalFilename: 'big.csv', size: redosCsv.length }])
        .valid
    ).toBe(true);
    expect(Date.now() - start).toBeLessThan(500);

    // RTF DDE rejected
    const rtfDde = Buffer.from('{\\rtf1{\\field{\\*\\fldinst {DDEAUTO c:\\\\windows\\\\system32\\\\cmd.exe}}}}', 'latin1');
    const p5 = createTempFile(rtfDde);
    expect(
      validateUploadedFilesForField(field, [{ filepath: p5, originalFilename: 'note.rtf', size: rtfDde.length }])
        .valid
    ).toBe(false);
  });

  it('maps Strapi ApplicationError to 400 and hides raw 500 error messages in submission controller', async () => {
    const errApp = Object.assign(new Error('File is not a valid image'), { name: 'ApplicationError' });
    (globalThis as any).strapi = {
      plugin: () => ({
        service: () => ({
          submit: vi.fn(async () => {
            throw errApp;
          }),
        }),
      }),
    };
    const ctx1: any = { params: { slug: 's' }, request: { body: {}, headers: {}, ip: '127.0.0.1' }, status: 200, body: null };
    await submissionController.submit(ctx1);
    expect(ctx1.status).toBe(400);
    expect(ctx1.body.message).toBe('File is not a valid image');

    (globalThis as any).strapi = {
      plugin: () => ({
        service: () => ({
          submit: vi.fn(async () => {
            throw new Error('SELECT * FROM secret_table failed');
          }),
        }),
      }),
    };
    const ctx2: any = { params: { slug: 's' }, request: { body: {}, headers: {}, ip: '127.0.0.1' }, status: 200, body: null };
    await submissionController.submit(ctx2);
    expect(ctx2.status).toBe(500);
    expect(ctx2.body.message).toBe('Internal server error');
  });

  it('guards verifyCaptcha against non-string tokens and sanitizes servePublicPage themeVars & CSP', async () => {
    expect(await verifyCaptcha('turnstile', 'sec', { evil: 1 } as any, '127.0.0.1')).toBe(false);

    const headers: Record<string, string> = {};
    (globalThis as any).strapi = {
      plugin: () => ({
        service: () => ({
          getPublicSchema: vi.fn(async () => ({
            data: {
              id: 1,
              slug: 'test',
              title: 'Test',
              description: '',
              fields: [],
              settings: {
                publicPage: true,
                captcha: { provider: 'turnstile', siteKey: 'pk' },
                theme: { fieldStyle: 'outline"><script>alert(1)</script>' },
                themeVars: {
                  '--sfb-bg': '#fff',
                  '</style><script>alert(1)</script>': 'x',
                },
              },
            },
          })),
        }),
      }),
    };
    const ctx: any = {
      params: { slug: 'test' },
      set: (k: string, v: string) => {
        headers[k] = v;
      },
      notFound: vi.fn(),
      body: '',
    };
    await formController.servePublicPage(ctx);
    expect(ctx.body).not.toContain('<script>alert(1)</script>');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    expect(headers['Content-Security-Policy']).toContain('https://challenges.cloudflare.com');
    expect(headers['Content-Security-Policy']).not.toContain('www.google.com');
  });

  it('catches PDF chained names & comment /URI bypass, ZIP Zip64/EOCD bypass, CSV tab-formula bypass, and RTF nested fldinst bypass', () => {
    const field = { name: 'doc', label: 'Doc', accept: '.pdf,.zip,.csv,.rtf', maxSizeMb: 5 };

    // 1. PDF chained names & % /URI ( comment bypass & javascript: /URI
    for (const payload of [
      '%PDF-1.7\n1 0 obj\n<</Type/Catalog/OpenAction 2 0 R>>\nendobj\n%%EOF',
      '%PDF-1.7\n1 0 obj\n<< /Type /Action /S/JavaScript /JS(app.alert(1)) >>\nendobj\n%%EOF',
      '%PDF-1.7\n% /URI (\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n%%EOF',
      '%PDF-1.7\n1 0 obj\n<< /URI (javascript:alert(1)) >>\nendobj\n%%EOF',
    ]) {
      const p = createTempFile(Buffer.from(payload, 'latin1'));
      expect(
        validateUploadedFilesForField(field, [{ filepath: p, originalFilename: 'a.pdf', size: payload.length }])
          .valid
      ).toBe(false);
    }

    // 2. ZIP with EOCD Zip64 sentinel (cdOffset = 0xffffffff) hiding a Central Directory traversal entry
    const cleanEntry = buildPkZipBuffer('safe.txt', 'ok');
    const eocd = Buffer.alloc(22);
    eocd[0] = 0x50; eocd[1] = 0x4b; eocd[2] = 0x05; eocd[3] = 0x06;
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(0, 12);
    eocd.writeUInt32LE(0xffffffff, 16);
    const badZip = Buffer.concat([cleanEntry, eocd]);
    const pZip = createTempFile(badZip);
    expect(
      validateUploadedFilesForField(field, [{ filepath: pZip, originalFilename: 'a.zip', size: badZip.length }])
        .valid
    ).toBe(false);

    // 3. CSV tab-break bypass (-1\t&HYPERLINK, @\tSUM)
    for (const csv of ['a,b\n-1\t&HYPERLINK("https://evil.example","x"),1\n', 'a,b\n@\tSUM(1,1),2\n']) {
      const p = createTempFile(Buffer.from(csv, 'utf8'));
      expect(
        validateUploadedFilesForField(field, [{ filepath: p, originalFilename: 'a.csv', size: csv.length }]).valid
      ).toBe(false);
    }

    // 4. RTF nested-brace {\f1 } inside \fldinst
    const nestedRtf = Buffer.from(
      '{\\rtf1{\\field{\\*\\fldinst {\\f1 } DDEAUTO c:\\\\windows\\\\system32\\\\cmd.exe}}}',
      'latin1'
    );
    const pRtf = createTempFile(nestedRtf);
    expect(
      validateUploadedFilesForField(field, [{ filepath: pRtf, originalFilename: 'a.rtf', size: nestedRtf.length }])
        .valid
    ).toBe(false);

    // 5. resolveClientAccept strips unsafe extensions
    expect(resolveClientAccept('.svg,.exe,.pdf,png')).toBe('.pdf,.png');
    expect(resolveClientAccept('.svg,.exe')).toBe('.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx');
  });

  it('treats maxSubmissionsPerHour <= 0 or empty string as default 60 instead of blocking all submissions', async () => {
    const createSubFn = vi.fn(async ({ data }) => ({ id: 1, ...data }));
    const mockStrapi: any = {
      plugin: (n: string) =>
        n === 'strapi-plugin-form-builder-cms'
          ? {
              service: (s: string) =>
                s === 'form'
                  ? {
                      findBySlug: vi.fn(async () => ({
                        id: 1,
                        slug: 'contact',
                        publishedAt: '2026-01-01T00:00:00.000Z',
                        publishedData: {
                          fields: [{ id: 'f1', type: 'text', name: 'name', label: 'Name', required: true }],
                          settings: { enableRateLimit: true, maxSubmissionsPerHour: 0 },
                        },
                      })),
                    }
                  : s === 'validation'
                    ? validationFactory()
                    : {},
            }
          : {},
      db: { query: () => ({ count: vi.fn(async () => 0), create: createSubFn }) },
    };
    const svc = submissionServiceFactory({ strapi: mockStrapi });
    const res = await svc.submit('contact', { name: 'Alice' }, { ip: '', userAgent: 'Vitest' });
    expect(res.success).toBe(true);
  });
});
