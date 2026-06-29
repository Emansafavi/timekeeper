import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { createEntry, entryFiltersFromSearchParams, listEntries } from '$lib/server/repository';

export function GET({ url }) {
  try {
    return json({
      entries: listEntries(entryFiltersFromSearchParams(url.searchParams))
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
