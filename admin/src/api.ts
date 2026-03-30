import { useFetchClient } from '@strapi/strapi/admin';

const BASE = '/strapi-plugin-form-builder-cms';

export function useFormsApi() {
  const { get, post, put, del } = useFetchClient();

  return {
    async getForms() {
      const { data } = await get(`${BASE}/forms`);
      return data;
    },

    async getForm(id: number) {
      const { data } = await get(`${BASE}/forms/${id}`);
      return data;
    },

    async createForm(body: any) {
      const { data } = await post(`${BASE}/forms`, body);
      return data;
    },

    async updateForm(id: number, body: any) {
      const { data } = await put(`${BASE}/forms/${id}`, body);
      return data;
    },

    async deleteForm(id: number) {
      await del(`${BASE}/forms/${id}`);
    },

    async duplicateForm(id: number) {
      const { data } = await post(`${BASE}/forms/${id}/duplicate`, {});
      return data;
    },

    async getSubmissions(formId: number, query: Record<string, any> = {}) {
      const params = new URLSearchParams(query as any).toString();
      const { data } = await get(`${BASE}/submissions/${formId}${params ? `?${params}` : ''}`);
      return data;
    },

    async getSubmission(id: number) {
      const { data } = await get(`${BASE}/submissions/entry/${id}`);
      return data;
    },

    async updateSubmissionStatus(id: number, status: string) {
      const { data } = await put(`${BASE}/submissions/${id}/status`, { status });
      return data;
    },

    async deleteSubmission(id: number) {
      await del(`${BASE}/submissions/${id}`);
    },

    async getStats(formId: number) {
      const { data } = await get(`${BASE}/submissions/${formId}/stats`);
      return data;
    },
  };
}
