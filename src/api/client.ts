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

    if (!response.ok) {
      // --- FIX: Don't logout if we are just trying to log in! ---
      // We check if the endpoint is NOT '/token' before emitting logout.
      if (response.status === 401 && !endpoint.includes('/token')) {
        authEvents.emitLogout();
        throw new Error("Session expired. Please login again.");
      }

      // Handle other errors
      let errorMessage = 'Something went wrong';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        errorMessage = await response.text();
      }

      throw new ApiError(errorMessage, response.status);
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    // FIX: Change console.error to console.log so the Red Box doesn't pop up
    console.log('API Call Failed:', error); 
    throw error;
  }
}

export { client };