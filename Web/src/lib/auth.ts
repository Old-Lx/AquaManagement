/**
 * Authentication Service
 * Simula llamadas a la API de autenticación
 */

export interface AuthResponse {
  username: string;
  token: string;
}

export interface LoginError {
  message: string;
  status: number;
}

/**
 * Simula una llamada POST /api/v1/auth/login
 * Credenciales válidas: username='lartrax', password='123456'
 */
export async function loginUser(
  username: string,
  password: string
): Promise<AuthResponse> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 800));

  const u = username.trim().toLowerCase();
  const p = password.trim();

  // Validar credenciales (tolerante a mayúsculas/minúsculas y espacios)
  if (u === 'lartrax' && p === '123456') {
    return {
      username: 'lartrax',
      token: 'MOCK_JWT_TOKEN_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    };
  }

  // Fallo de autenticación
  throw {
    message: 'Invalid username or password',
    status: 401
  } as LoginError;
}

/**
 * Simula la validación del token actual
 */
export async function validateToken(token: string): Promise<boolean> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Para este mock, cualquier token que comience con 'MOCK_JWT_TOKEN' es válido
  return token.startsWith('MOCK_JWT_TOKEN');
}
