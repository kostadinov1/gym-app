import * as SecureStore from 'expo-secure-store';

// const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const BASE_URL = 'https://gym-api-m6vx.onrender.com'; 

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
      // 1. Try to parse JSON error (e.g. {"detail": "Email already registered"})
      let errorMessage = 'Something went wrong';
      try {
        const errorData = await response.json();
        // Backend usually sends "detail"
        errorMessage = errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        // Fallback if not JSON
        errorMessage = await response.text();
      }

      throw new ApiError(errorMessage, response.status);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
}

export { client };