import { apiRequest } from './apiClient'

const TOKEN_KEY = 'drummaster-auth-token'

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

interface AuthResponse {
  token: string
  user: AuthUser
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })

  localStorage.setItem(TOKEN_KEY, response.token)
  return response.user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  localStorage.setItem(TOKEN_KEY, response.token)
  return response.user
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
}
