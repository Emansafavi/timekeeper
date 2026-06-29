import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { deleteEntry, updateEntry } from '$lib/server/repository';

export async function PUT(event) {
  try {
    const body = await readJson(event);
    return json({
      entry: updateEntry(Number(event.params.id), {
        profileId: Number(body.profileId),
        startAt: String(body.startAt),
        endAt: String(body.endAt),
        note: String(body.note || ''),
        tags: body.tags,
        allowOverlap: Boolean(body.allowOverlap)
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export function DELETE(event) {
  try {
    deleteEntry(Number(event.params.id));
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
