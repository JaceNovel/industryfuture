import { getToken } from "@/lib/auth";

function getBaseUrl() {
  // In the browser, prefer same-origin calls and let Next.js rewrites proxy /api/*
  // to the Laravel backend. This avoids CORS issues and "Failed to fetch".
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const token = typeof window !== "undefined" ? getToken() : null;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: HeadersInit = {
    Accept: "application/json",
    ...(init?.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (init?.body && !isFormData && !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const payload = typeof FormData !== "undefined" && body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;
  return apiFetch<T>(path, {
    method: "POST",
    body: payload,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const payload = typeof FormData !== "undefined" && body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;
  return apiFetch<T>(path, {
    method: "PATCH",
    body: payload,
  });
}

export function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const payload = typeof FormData !== "undefined" && body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;
  return apiFetch<T>(path, {
    method: "DELETE",
    body: payload,
  });
}
