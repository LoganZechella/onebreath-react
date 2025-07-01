import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { auth } from './firebase';

const baseURL: string = (Constants.expoConfig?.extra as any)?.apiUrl || 'http://localhost:5000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Attach token if available
    this.api.interceptors.request.use(async (config) => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for logging
    this.api.interceptors.response.use(
      (res) => res,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Example endpoints
  async getSamples() {
    const res = await this.api.get('/api/samples');
    return res.data;
  }

  async registerSampleFromQR(chipId: string, additionalData?: any) {
    const res = await this.api.post('/api/samples/register-qr', { chipId, ...additionalData });
    return res.data;
  }
}

export const apiService = new ApiService();
export default apiService;