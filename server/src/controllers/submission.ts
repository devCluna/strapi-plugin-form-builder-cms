const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

export default {
  async submit(ctx: any) {
    const { slug } = ctx.params;
    try {
      const result = await strapi.plugin(PLUGIN_ID).service('submission').submit(
        slug,
        ctx.request.body,
        {
          ip: ctx.request.ip,
          userAgent: ctx.request.headers['user-agent'] || '',
        }
      );
      ctx.body = result;
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        ctx.status = 400;
        ctx.body = { success: false, errors: error.details };
      } else if (error.name === 'NotFoundError') {
        return ctx.notFound('Form not found');
      } else {
        throw error;
      }
    }
  },

  async find(ctx: any) {
    const { formId } = ctx.params;
    const submissions = await strapi.plugin(PLUGIN_ID).service('submission').find(Number(formId), ctx.query);
    ctx.body = submissions;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const submission = await strapi.plugin(PLUGIN_ID).service('submission').findOne(Number(id));
    if (!submission) return ctx.notFound('Submission not found');
    ctx.body = submission;
  },

  async updateStatus(ctx: any) {
    const { id } = ctx.params;
    const { status } = ctx.request.body;
    const submission = await strapi.plugin(PLUGIN_ID).service('submission').updateStatus(Number(id), status);
    ctx.body = submission;
  },

  async delete(ctx: any) {
    const { id } = ctx.params;
    await strapi.plugin(PLUGIN_ID).service('submission').delete(Number(id));
    ctx.status = 204;
  },

  async export(ctx: any) {
    const { formId } = ctx.params;
    const format = (ctx.query.format as string) || 'csv';
    const data = await strapi.plugin(PLUGIN_ID).service('submission').export(Number(formId), format);
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';
    ctx.set('Content-Disposition', `attachment; filename=submissions.${ext}`);
    ctx.set('Content-Type', mime);
    ctx.body = data;
  },

  async stats(ctx: any) {
    const { formId } = ctx.params;
    const stats = await strapi.plugin(PLUGIN_ID).service('submission').getStats(Number(formId));
    ctx.body = stats;
  },
};
