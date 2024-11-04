import axios from 'axios';
import { auth } from './firebase';
import { Sample, AnalyzedSample } from '../types';

const api = axios.create({
  baseURL: 'https://onebreath-react.onrender.com',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ensure OPTIONS requests are handled properly
  if (config.method === 'options') {
    config.headers['Access-Control-Request-Method'] = 'GET';
    config.headers['Access-Control-Request-Headers'] = 'authorization,content-type';
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on auth error
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
      console.log('Fetching completed samples...');
      const response = await api.get('/completed_samples');
      console.log('Completed samples response:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching completed samples:', error);
      return [];
    }
  },

  getAnalyzedSamples: async (): Promise<AnalyzedSample[]> => {
    try {
      const response = await api.get('/analyzed');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching analyzed samples:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Handle unauthorized error
        window.location.href = '/login';
      }
      return [];
    }
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