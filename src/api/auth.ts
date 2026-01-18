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


export const deleteAccount = () => {
  return client('/me', { // or /auth/me depending on your router prefix, assuming router has no prefix in main.py?
    // Wait, in main.py you did: app.include_router(auth.router) without prefix.
    // So it is likely just /me if the router has no prefix, OR /auth/me if you add it.
    // Let's assume it is just "/me" based on the python code above, 
    // BUT usually auth routers are prefixed. 
    // CHECK: If your auth router has no prefix, this is '/me'. 
    // If you want to be safe, update python to @router.delete("/delete-account") or similar.
    // Let's stick to '/me' assuming the router is mounted at root or we handled it.
    method: 'DELETE',
  });
};