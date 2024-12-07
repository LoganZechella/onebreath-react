import { io, Socket } from 'socket.io-client';
import { LogEntry, RequestLog, PerformanceMetric, ServerHealth } from '../types/admin';
import { auth } from './firebase';

class AdminService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  async connect() {
    if (this.socket?.connected) return;

    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('No auth token available');

    this.socket = io(`${import.meta.env.VITE_API_URL}/admin`, {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to admin socket');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('log_update', (data) => {
      this.notifyListeners('log_update', data);
    });

    this.socket.on('connection_update', (data) => {
      this.notifyListeners('connection_update', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from admin socket');
    });
  }

  public addListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public removeListener(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private async getAuthHeaders() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('No auth token available');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getServerHealth(): Promise<ServerHealth> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/health`, {
        headers: await this.getAuthHeaders(),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  async getErrorLogs(days: number = 3): Promise<LogEntry[]> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/logs/error?days=${days}`,
        {
          headers: await this.getAuthHeaders(),
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching error logs:', error);
      return [];
    }
  }

  async getRequestLogs(days: number = 3): Promise<RequestLog[]> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/logs/request?days=${days}`,
        {
          headers: await this.getAuthHeaders(),
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching request logs:', error);
      return [];
    }
  }

  async getMetrics(): Promise<PerformanceMetric[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/metrics`, {
        headers: await this.getAuthHeaders(),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const adminService = new AdminService();