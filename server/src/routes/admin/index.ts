export default {
  type: 'admin',
  routes: [
    { method: 'GET',    path: '/forms',                         handler: 'form.find' },
    { method: 'GET',    path: '/forms/:id',                     handler: 'form.findOne' },
    { method: 'POST',   path: '/forms',                         handler: 'form.create' },
    { method: 'PUT',    path: '/forms/:id',                     handler: 'form.update' },
    { method: 'DELETE', path: '/forms/:id',                     handler: 'form.delete' },
    { method: 'POST',   path: '/forms/:id/duplicate',           handler: 'form.duplicate' },
    { method: 'GET',    path: '/submissions/:formId',           handler: 'submission.find' },
    { method: 'GET',    path: '/submissions/entry/:id',         handler: 'submission.findOne' },
    { method: 'PUT',    path: '/submissions/:id/status',        handler: 'submission.updateStatus' },
    { method: 'DELETE', path: '/submissions/:id',               handler: 'submission.delete' },
    { method: 'GET',    path: '/submissions/:formId/export',    handler: 'submission.export' },
    { method: 'GET',    path: '/submissions/:formId/stats',     handler: 'submission.stats' },
  ],
};
