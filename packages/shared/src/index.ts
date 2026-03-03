// Shared types and utilities for ERP system

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const API_BASE_URL = '/api';
