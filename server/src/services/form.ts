const PLUGIN_ID = 'strapi-plugin-form-builder-cms';
const FORM_UID = `plugin::${PLUGIN_ID}.form`;

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'form';
  return `${base}-${Date.now()}`;
}

export default ({ strapi }: { strapi: any }) => ({
  async find() {
    return strapi.db.query(FORM_UID).findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async findOne(id: number) {
    return strapi.db.query(FORM_UID).findOne({
      where: { id },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async findBySlug(slug: string) {
    return strapi.db.query(FORM_UID).findOne({
      where: { slug },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async create(data: any) {
    const slug = generateSlug(data.title || 'form');
    return strapi.db.query(FORM_UID).create({ data: { ...data, slug } });
  },

  async update(id: number, data: any) {
    return strapi.db.query(FORM_UID).update({ where: { id }, data });
  },

  async delete(id: number) {
    return strapi.db.query(FORM_UID).delete({ where: { id } });
  },

  async duplicate(id: number) {
    const original = await strapi.db.query(FORM_UID).findOne({ where: { id } });
    if (!original) return null;

    const { id: _id, slug, createdAt, updatedAt, publishedAt, ...rest } = original;
    return strapi.db.query(FORM_UID).create({
      data: {
        ...rest,
        title: `${rest.title} (copy)`,
        slug: generateSlug(`${rest.title} copy`),
      },
    });
  },

  async getPublicSchemaById(id: number) {
    const form = await this.findOne(id);
    if (!form) return null;
    return {
      data: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        description: form.description,
        fields: form.fields || [],
        settings: form.settings || {},
      },
    };
  },

  async getPublicSchema(slug: string) {
    const form = await this.findBySlug(slug);
    if (!form) return null;

    return {
      data: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        description: form.description,
        fields: form.fields || [],
        conditionalLogic: form.conditionalLogic || [],
        settings: form.settings || {},
      },
    };
  },
});
