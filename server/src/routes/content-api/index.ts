export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/forms/:slug/schema',
      handler: 'form.getPublicSchema',
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
