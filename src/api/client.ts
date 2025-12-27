// REPLACE THIS IP with your specific LAN IP
const BASE_URL = 'http://192.168.10.121:8000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// A generic wrapper to handle JSON and Errors automatically
export async function client<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // Security: Handle 400/500 errors explicitly
      const errorBody = await response.text();
      throw new ApiError(errorBody || 'Network response was not ok', response.status);
    }

    // Security: Validate that the response is actually JSON
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Log error securely (don't alert sensitive info in production)
    console.error('API Call Failed:', error);
    throw error;
  }
}
