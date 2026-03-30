const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

export default {
  async find(ctx: any) {
    const forms = await strapi.plugin(PLUGIN_ID).service('form').find(ctx.query);
    ctx.body = forms;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').findOne(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async create(ctx: any) {
    const form = await strapi.plugin(PLUGIN_ID).service('form').create(ctx.request.body);
    ctx.body = form;
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').update(Number(id), ctx.request.body);
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async delete(ctx: any) {
    const { id } = ctx.params;
    await strapi.plugin(PLUGIN_ID).service('form').delete(Number(id));
    ctx.status = 204;
  },

  async duplicate(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').duplicate(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async getPublicSchema(ctx: any) {
    const { slug } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchema(slug);
    if (!schema) return ctx.notFound('Form not found');
    ctx.body = schema;
  },
};
