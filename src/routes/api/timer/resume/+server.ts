import { json } from '@sveltejs/kit';
import { handleApiError } from '$lib/server/http';
import { resumeTimer } from '$lib/server/repository';

export function POST() {
  try {
    return json({ activeTimer: resumeTimer() });
  } catch (error) {
    return handleApiError(error);
  }
}
