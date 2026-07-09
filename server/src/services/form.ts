const PLUGIN_ID = 'strapi-plugin-form-builder-cms';
const FORM_UID = `plugin::${PLUGIN_ID}.form`;

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'form';
  return `${base}-${Date.now()}`;
}

// Frozen copy of the working form stored at publish time — what the public is served.
function snapshotOf(data: any) {
  return {
    title: data.title,
    description: data.description ?? '',
    fields: data.fields ?? [],
    conditionalLogic: data.conditionalLogic ?? [],
    settings: data.settings ?? {},
  };
}

export default ({ strapi }: { strapi: any }) => ({
  async find() {
    const forms = await strapi.db.query(FORM_UID).findMany({
      orderBy: { createdAt: 'desc' },
    });
    // ponytail: one count query per form; fine at admin-list scale, revisit with a groupBy if forms grow large
    const SUBMISSION_UID = `plugin::${PLUGIN_ID}.form-submission`;
    return Promise.all(
      forms.map(async (form: any) => ({
        ...form,
        submissionCount: await strapi.db.query(SUBMISSION_UID).count({ where: { form: form.id } }),
      }))
    );
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
    const payload: any = { ...data, slug };
    // Publishing captures the working copy as the immutable live snapshot.
    if (data.publishedAt) payload.publishedData = snapshotOf(data);
    return strapi.db.query(FORM_UID).create({ data: payload });
  },

  async update(id: number, data: any) {
    const payload: any = { ...data };
    if (data.publishedAt) {
      // Publish: freeze the current working copy as the live version.
      payload.publishedData = snapshotOf(data);
    } else {
      // Save draft: never unpublish or overwrite what the public sees.
      delete payload.publishedAt;
      delete payload.publishedData;
    }
    return strapi.db.query(FORM_UID).update({ where: { id }, data: payload });
  },

  async delete(id: number) {
    return strapi.db.query(FORM_UID).delete({ where: { id } });
  },

  async duplicate(id: number) {
    const original = await strapi.db.query(FORM_UID).findOne({ where: { id } });
    if (!original) return null;

    const { id: _id, slug, createdAt, updatedAt, publishedAt, publishedData, ...rest } = original;
    return strapi.db.query(FORM_UID).create({
      data: {
        ...rest,
        title: `${rest.title} (copy)`,
        slug: generateSlug(`${rest.title} copy`),
      },
    });
  },

  // Public views serve the published snapshot only — draft edits never leak.
  async getPublicSchemaById(id: number) {
    const form = await this.findOne(id);
    return publicSchemaFrom(form);
  },

  async getPublicSchema(slug: string) {
    const form = await this.findBySlug(slug);
    return publicSchemaFrom(form);
  },
});

export function publicSchemaFrom(form: any) {
  if (!form || !form.publishedAt) return null;
  // Legacy fallback: forms published before publishedData existed serve their current copy.
  const p = form.publishedData || snapshotOf(form);
  const settings = p.settings || {};
  // Never leak the CAPTCHA secret key to the browser — strip it, keep the public site key.
  const safeSettings = settings.captcha
    ? { ...settings, captcha: { provider: settings.captcha.provider, siteKey: settings.captcha.siteKey } }
    : settings;
  return {
    data: {
      id: form.id,
      slug: form.slug,
      title: p.title,
      description: p.description,
      fields: p.fields || [],
      conditionalLogic: p.conditionalLogic || [],
      settings: safeSettings,
    },
  };
}
