// REPLACE THIS IP with your specific LAN IP
const BASE_URL = 'http://192.168.10.121:8000';
import * as SecureStore from 'expo-secure-store';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function client<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 1. Get Token
  const token = await SecureStore.getItemAsync('userToken');

  // 2. Attach Header
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    // ... (Rest of logic remains the same: error handling, json parsing)
    if (!response.ok) {
        if (response.status === 401) {
            // Optional: Broadcast a logout event here if token expired
        }
        const errorBody = await response.text();
        throw new ApiError(errorBody || 'Network response was not ok', response.status);
    }
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
}

export { client };

