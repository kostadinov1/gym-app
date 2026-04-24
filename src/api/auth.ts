import { client } from './client';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  email?: string;
}

export interface UserMe {
  id: string;
  email: string;
  full_name: string | null;
  is_email_verified: boolean;
  has_password: boolean;
}

// ---------------------------------------------------------------------------
// Email / password auth
// ---------------------------------------------------------------------------

export const login = (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  return client<AuthResponse>('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
};

export const register = (email: string, password: string) => {
  return client('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

// ---------------------------------------------------------------------------
// Current user profile
// ---------------------------------------------------------------------------

export const getMe = () => client<UserMe>('/me', { method: 'GET' });

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

export const googleSignIn = (accessToken: string) =>
  client<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  });

export const googleLink = (accessToken: string, password: string) =>
  client<AuthResponse>('/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, password }),
  });

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export const sendVerificationEmail = () =>
  client('/auth/send-verification', { method: 'POST' });

// ---------------------------------------------------------------------------
// Password reset (unauthenticated)
// ---------------------------------------------------------------------------

export const forgotPassword = (email: string) =>
  client('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, newPassword: string) =>
  client('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });

// ---------------------------------------------------------------------------
// Change password (authenticated)
// ---------------------------------------------------------------------------

export const changePassword = (currentPassword: string, newPassword: string) =>
  client('/me/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

export const deleteAccount = () => client('/me', { method: 'DELETE' });
