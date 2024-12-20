import axios from 'axios';
import { auth } from './firebase';
import { Sample, AnalyzedSample, PickupData } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://onebreath-react.onrender.com',
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
  sample_type: string;
  status: string;
  timestamp: string;
}

interface StatisticsSummaryResponse {
    success: boolean;
    insights: string;
    cached: boolean;
    sampleCount: number;
}

interface AIResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface StatDetails {
  description?: string;
  breakdown?: { label: string; value: string | number }[];
  trends?: { label: string; value: string | number }[];
  implications?: string[];
  relatedMetrics?: { label: string; value: string | number }[];
  visualizationType?: 'bar' | 'pie' | 'line';
}

interface StatDetailsResponse {
  success: boolean;
  details?: StatDetails;
  error?: string;
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

  getStatisticsSummary: async (): Promise<StatisticsSummaryResponse> => {
    try {
      const response = await api.get('/statistics_summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
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

  downloadDataset: async (): Promise<Blob> => {
    try {
      const response = await axios.get('https://onebreath-react.onrender.com/download_dataset', {
        responseType: 'blob',
        headers: {
          'Accept': 'text/csv',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      });
      return new Blob([response.data], { type: 'text/csv' });
    } catch (error) {
      console.error('Error downloading dataset:', error);
      throw error;
    }
  },

  registerSample: async (data: SampleRegistrationData) => {
    const response = await api.post('/update_sample', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to register sample');
    }
    return response.data;
  },

  updateExpiredSamples: async () => {
    try {
      const response = await api.post('/update_expired_samples');
      return response.data;
    } catch (error) {
      console.error('Error updating expired samples:', error);
      throw error;
    }
  },

  async getAIResponse(question: string, context: any): Promise<AIResponse> {
    try {
      const response = await api.post('/ai/chat', {
        question,
        context
      });

      return {
        success: true,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response'
      };
    }
  },

  async getStatDetails(sectionTitle: string, statLabel: string): Promise<StatDetailsResponse> {
    try {
      const response = await api.post('/ai/stat_details', {
        section: sectionTitle,
        stat: statLabel
      });

      return {
        success: true,
        details: response.data.details
      };
    } catch (error) {
      console.error('Error in getStatDetails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stat details'
      };
    }
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

export const updateSampleWithPickupData = async (
  chipId: string,
  status: string,
  sampleType: string,
  pickupData: PickupData
): Promise<void> => {
  const response = await api.put(`/samples/${chipId}/pickup`, {
    status,
    sample_type: sampleType,
    average_co2: pickupData.co2_level,
    final_volume: pickupData.volume,
    patient_id: pickupData.patient_id,
    ...(pickupData.error && { error: pickupData.error })
  });

  if (!response.data.success) {
    throw new Error('Failed to update sample with pickup data');
  }
}; 