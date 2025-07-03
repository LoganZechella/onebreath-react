export interface Sample {
  id: string;
  chipId: string;
  status: 'In Process' | 'Ready for Pickup' | 'Picked up. Ready for Analysis' | 'Completed';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  location?: string;
  assignedTo?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface SocketEvents {
  'sample:updated': Sample;
  'sample:created': Sample;
  'admin:log': {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    user?: string;
  };
}

export * from './navigation';
export * from './qr';