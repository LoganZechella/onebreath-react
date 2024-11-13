import { User as FirebaseUser } from 'firebase/auth';

export interface User extends FirebaseUser {
  claims?: {
    admin?: boolean;
    [key: string]: any;
  };
} 