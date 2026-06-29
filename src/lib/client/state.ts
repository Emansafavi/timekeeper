import { writable } from 'svelte/store';
import type { ActiveTimer, DashboardStats, Profile, Settings, TimeEntry } from '$lib/types';

export type AppState = {
  profiles: Profile[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
  stats: DashboardStats;
  recentEntries: TimeEntry[];
  tags: string[];
  fetchedAt: number;
};

export const appState = writable<AppState | null>(null);
export const apiError = writable<string | null>(null);

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data as T;
}

export async function refreshState(): Promise<AppState> {
  try {
    const state = await requestJson<AppState>('/api/state');
    state.fetchedAt = Date.now();
    appState.set(state);
    apiError.set(null);
    return state;
  } catch (error) {
    apiError.set(error instanceof Error ? error.message : 'Could not load app state.');
    throw error;
  }
}

export async function mutate<T>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  try {
    const result = await requestJson<T>(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    await refreshState();
    return result;
  } catch (error) {
    apiError.set(error instanceof Error ? error.message : 'Could not save changes.');
    throw error;
  }
}
