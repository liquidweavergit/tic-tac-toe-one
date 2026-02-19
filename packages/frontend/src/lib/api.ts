const BASE = '/api/v1';

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  signUp: (data: { username: string; password: string; screenName: string }) =>
    request<{ screenName: string }>('POST', '/signUp', data),
  signIn: (data: { username: string; password: string }) =>
    request<{ screenName: string }>('POST', '/signIn', data),
  me: () => request<{ screenName: string; wins: number; losses: number }>('GET', '/me'),
  signOut: () => request<{ ok: boolean }>('POST', '/signOut'),
  usernameAvailable: (username: string) =>
    request<{ available: boolean }>('GET', `/usernameAvailable?username=${encodeURIComponent(username)}`),
  screenNameAvailable: (screenName: string) =>
    request<{ available: boolean }>('GET', `/screenNameAvailable?screenName=${encodeURIComponent(screenName)}`),
};
