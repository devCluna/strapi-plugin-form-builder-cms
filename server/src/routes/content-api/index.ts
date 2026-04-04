export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/embed.js',
      handler: 'form.serveEmbed',
      config: { auth: false, policies: [] },
    },
    {
      method: 'GET',
      path: '/forms/:id/embed-schema',
      handler: 'form.getPublicSchemaById',
      config: { auth: false, policies: [] },
    },
    {
      method: 'GET',
      path: '/forms/:slug/schema',
      handler: 'form.getPublicSchema',
      config: { auth: false, policies: [] },
    },
    {
      method: 'GET',
      path: '/page/:slug',
      handler: 'form.servePublicPage',
      config: { auth: false, policies: [] },
    },
    {
      method: 'POST',
      path: '/forms/:slug/submit',
      handler: 'submission.submit',
      config: { auth: false, policies: [] },
    },
  ],
};
