import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const baseURL: string = (Constants.expoConfig?.extra as any)?.apiUrl || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      this.socket = io(baseURL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => resolve(this.socket!));
      this.socket.on('connect_error', reject);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, cb: (...args: any[]) => void) {
    this.socket?.on(event, cb);
  }
}

export const socketService = new SocketService();
export default socketService;