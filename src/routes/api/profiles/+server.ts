import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { createProfile, listProfiles, updateProfile } from '$lib/server/repository';

export function GET() {
  try {
    return json({ profiles: listProfiles() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(event) {
  try {
    const body = await readJson(event);
    return json({ profile: createProfile(body) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(event) {
  try {
    const body = await readJson(event);
    return json({ profile: updateProfile(Number(body.id), body) });
  } catch (error) {
    return handleApiError(error);
  }
}
