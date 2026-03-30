import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { FormListPage } from './FormListPage';
import { FormBuilderPage } from './FormBuilderPage';
import { SubmissionsPage } from './SubmissionsPage';

const App = () => {
  return (
    <Routes>
      <Route index element={<FormListPage />} />
      <Route path="builder/new" element={<FormBuilderPage />} />
      <Route path="builder/:id" element={<FormBuilderPage />} />
      <Route path="submissions/:formId" element={<SubmissionsPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
