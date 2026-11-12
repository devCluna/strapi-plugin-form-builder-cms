import { cleanupTempFiles, RawUploadedFile } from '../lib/file-upload';

const PLUGIN_ID = 'strapi-plugin-form-builder-cms';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUnsafeKey(key: string): boolean {
  return !key || UNSAFE_KEYS.has(key) || key in Object.prototype;
}

export default {
  async submit(ctx: any) {
    const { slug } = ctx.params;
    const filesByField: Record<string, RawUploadedFile[]> = {};
    const allRawFiles: RawUploadedFile[] = [];

    try {
      // Collect ALL multipart files first so the finally block always cleans them up,
      // even if the field key is empty, malformed, or blocked by prototype-pollution guards.
      const rawFiles = ctx.request.files;
      if (rawFiles && typeof rawFiles === 'object') {
        for (const [rawKey, rawVal] of Object.entries(rawFiles)) {
          const list = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
          const validItems: RawUploadedFile[] = [];
          for (const item of list) {
            if (item && typeof item === 'object' && typeof (item as any).filepath === 'string') {
              allRawFiles.push(item as RawUploadedFile);
              validItems.push(item as RawUploadedFile);
            }
          }

          let key = rawKey;
          if (key.startsWith('files.')) key = key.slice(6);
          if (key.endsWith('[]')) key = key.slice(0, -2);
          if (isUnsafeKey(key)) continue;

          if (!Object.prototype.hasOwnProperty.call(filesByField, key) || !Array.isArray(filesByField[key])) {
            filesByField[key] = [];
          }
          filesByField[key].push(...validItems);
        }
      }

      const body = ctx.request.body;
      let raw: any = body;
      if (body && typeof body === 'object' && 'data' in body) {
        if (typeof body.data === 'string') {
          try {
            raw = JSON.parse(body.data);
          } catch {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Invalid JSON in form data payload' };
            return;
          }
        } else {
          raw = body.data;
        }
      }

      // normalize checkbox-group keys: { 'field[]': v } → { field: [v] }
      const data: Record<string, any> = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw)) {
          const cleanKey = k.endsWith('[]') ? k.slice(0, -2) : k;
          if (isUnsafeKey(cleanKey)) continue;
          if (k.endsWith('[]')) {
            if (!Object.prototype.hasOwnProperty.call(data, cleanKey) || !Array.isArray(data[cleanKey])) {
              data[cleanKey] = [];
            }
            (data[cleanKey] as any[]).push(v);
          } else {
            data[cleanKey] = v;
          }
        }
      }

      const result = await strapi.plugin(PLUGIN_ID).service('submission').submit(
        slug,
        data,
        {
          ip: ctx.request.ip,
          userAgent: ctx.request.headers['user-agent'] || '',
        },
        filesByField
      );
      ctx.body = result;
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        ctx.status = 400;
        ctx.body = { success: false, errors: error.details };
      } else if (error?.name === 'CaptchaError' || error?.name === 'ApplicationError') {
        ctx.status = 400;
        ctx.body = { success: false, message: error.message || 'Invalid submission' };
      } else if (error?.name === 'PayloadTooLargeError') {
        ctx.status = 413;
        ctx.body = { success: false, message: 'Uploaded file is too large' };
      } else if (error?.name === 'RateLimitError') {
        ctx.status = 429;
        ctx.body = { success: false, message: error.message };
      } else if (error?.name === 'NotFoundError') {
        return ctx.notFound('Form not found');
      } else {
        console.error('[sfb] unhandled submit error:', error?.message, error?.stack);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Internal server error' };
      }
    } finally {
      cleanupTempFiles({ __all__: allRawFiles });
    }
  },

  async testCaptcha(ctx: any) {
    const { provider, secretKey } = ctx.request.body || {};
    const result = await strapi.plugin(PLUGIN_ID).service('submission').testCaptchaSecret(provider, secretKey);
    ctx.body = result;
  },

  async find(ctx: any) {
    const formId = Number(ctx.params.formId);
    if (!Number.isInteger(formId) || formId <= 0) return ctx.badRequest('Invalid formId');
    const submissions = await strapi.plugin(PLUGIN_ID).service('submission').find(formId, ctx.query);
    ctx.body = submissions;
  },

  async findOne(ctx: any) {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id <= 0) return ctx.notFound('Submission not found');
    const submission = await strapi.plugin(PLUGIN_ID).service('submission').findOne(id);
    if (!submission) return ctx.notFound('Submission not found');
    ctx.body = submission;
  },

  async updateStatus(ctx: any) {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id <= 0) return ctx.notFound('Submission not found');
    const { status } = ctx.request.body || {};
    if (!['new', 'read', 'archived'].includes(status)) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid status' };
      return;
    }
    const submission = await strapi.plugin(PLUGIN_ID).service('submission').updateStatus(id, status);
    if (!submission) return ctx.notFound('Submission not found');
    ctx.body = submission;
  },

  async delete(ctx: any) {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id <= 0) return ctx.notFound('Submission not found');
    await strapi.plugin(PLUGIN_ID).service('submission').delete(id);
    ctx.status = 204;
  },

  async export(ctx: any) {
    const formId = Number(ctx.params.formId);
    if (!Number.isInteger(formId) || formId <= 0) return ctx.notFound('Form not found');
    const data = await strapi.plugin(PLUGIN_ID).service('submission').export(formId, 'csv');
    if (data === null) return ctx.notFound('Form not found');
    ctx.set('Content-Disposition', 'attachment; filename=submissions.csv');
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.body = data;
  },

  async stats(ctx: any) {
    const formId = Number(ctx.params.formId);
    if (!Number.isInteger(formId) || formId <= 0) return ctx.badRequest('Invalid formId');
    const stats = await strapi.plugin(PLUGIN_ID).service('submission').getStats(formId);
    ctx.body = stats;
  },
};
