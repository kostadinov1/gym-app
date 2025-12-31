import { client } from './client';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const login = (email: string, password: string) => {
  // FastAPI expects form-data for OAuth2, not JSON
  const formData = new URLSearchParams();
  formData.append('username', email); // FastAPI maps 'username' to email
  formData.append('password', password);

  return client<AuthResponse>('/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
};

export const register = (email: string, password: string) => {
  return client('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};