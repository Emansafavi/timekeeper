import { json, type RequestEvent } from '@sveltejs/kit';
import { AppError } from './repository';

export async function readJson<T = any>(event: RequestEvent): Promise<T> {
  try {
    return (await event.request.json()) as T;
  } catch {
    throw new AppError('Request body must be valid JSON.');
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return json({ message: error.message }, { status: error.status });
  }
  console.error(error);
  return json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
}
