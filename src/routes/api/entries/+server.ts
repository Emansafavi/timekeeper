import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { createEntry, listEntries } from '$lib/server/repository';

export function GET({ url }) {
  try {
    const profileId = url.searchParams.get('profileId');
    return json({
      entries: listEntries({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        profileId: profileId ? Number(profileId) : null,
        tag: url.searchParams.get('tag'),
        limit: Number(url.searchParams.get('limit') || 250)
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(event) {
  try {
    const body = await readJson(event);
    return json({
      entry: createEntry({
        profileId: Number(body.profileId),
        startAt: String(body.startAt),
        endAt: String(body.endAt),
        note: String(body.note || ''),
        tags: body.tags,
        allowOverlap: Boolean(body.allowOverlap)
      })
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
