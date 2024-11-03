import axios from 'axios';
import { Sample } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface SampleRegistrationData {
  chip_id: string;
  patient_id: string;
  location: string;
  status: string;
  timestamp: string;
}

export const sampleService = {
  getSamples: async (): Promise<Sample[]> => {
    try {
      const response = await api.get('/samples');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching samples:', error);
      return [];
    }
  },

  updateSample: async (data: any) => {
    const response = await api.post('/update_sample', data);
    return response.data;
  },

  updatePatientInfo: async (data: any) => {
    const response = await api.post('/update_patient_info', data);
    return response.data;
  },

  getCompletedSamples: async (): Promise<Sample[]> => {
    try {
      const response = await api.get('/completed_samples');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching completed samples:', error);
      return [];
    }
  },

  getAnalyzedSamples: async () => {
    const response = await api.get('/analyzed');
    return response.data;
  },

  getAIAnalysis: async () => {
    const response = await api.get('/ai_analysis');
    return response.data;
  },

  uploadDocumentMetadata: async (data: any) => {
    const response = await api.post('/upload_document_metadata', data);
    return response.data;
  },

  generatePresignedUrl: async (fileName: string) => {
    const response = await api.post('/generate_presigned_url', { file_name: fileName });
    return response.data;
  },

  uploadFromMemory: async (data: any) => {
    const response = await api.post('/upload_from_memory', data);
    return response.data;
  },

  downloadDataset: async () => {
    const response = await api.get('/download_dataset', { responseType: 'blob' });
    return response.data;
  },

  registerSample: async (data: SampleRegistrationData) => {
    const response = await api.post('/update_sample', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to register sample');
    }
    return response.data;
  },
};

export const authService = {
  signIn: async (idToken: string) => {
    const response = await api.post('/auth/signin', { idToken });
    return response.data;
  },

  googleSignIn: async (idToken: string) => {
    const response = await api.post('/auth/googleSignIn', { idToken });
    return response.data;
  }
}; 