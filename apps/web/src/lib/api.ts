const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AuthResponse {
  id: string;
  email: string;
}

export interface ExtractionResult {
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  unknownFields: string[];
  warnings: string[];
}

export interface Extraction extends ExtractionResult {
  _id: string;
  promptVersion: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status: string;
  createdAt: string;
  parentExtractionId: string | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: hasBody ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  createExtraction: (text: string) =>
    request<Extraction & { id: string; cached: boolean }>('/extractions', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  refineExtraction: (id: string, question: string) =>
    request<Extraction & { id: string; cached: boolean }>(`/extractions/${id}/refine`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  listExtractions: () => request<{ extractions: Extraction[] }>('/extractions'),

  getExtraction: (id: string) => request<Extraction>(`/extractions/${id}`),

  deleteExtraction: (id: string) => request<void>(`/extractions/${id}`, { method: 'DELETE' }),
};
