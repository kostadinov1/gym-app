import * as SecureStore from 'expo-secure-store';
import { authEvents } from '../utils/authEvents';

// READ FROM ENV
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Safety Check: If this is undefined, crash loudly so you know the build failed
if (!BASE_URL) {
  throw new Error("🚨 EXPO_PUBLIC_API_URL is missing! The app cannot connect.");
}
console.log(`[API] URL: ${BASE_URL}`);

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function client<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await SecureStore.getItemAsync('userToken');

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

    // 1. Handle Errors (If status is NOT 200-299)
    if (!response.ok) {
      // Handle Token Expiry (401)
      if (response.status === 401) {
        authEvents.emitLogout();
        throw new Error("Session expired. Please login again.");
      }

      // Handle other errors
      let errorMessage = 'Something went wrong';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        // Fallback if backend didn't send JSON
        errorMessage = await response.text();
      }

      throw new ApiError(errorMessage, response.status);
    }

    // 2. Handle Success
    const data = await response.json();
    return data as T;

  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
}

export { client };