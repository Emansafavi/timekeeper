import { listEntries } from '$lib/server/repository';
import { toCsv } from '$lib/server/export';
import { handleApiError } from '$lib/server/http';

export function GET({ url }) {
  try {
    const profileId = url.searchParams.get('profileId');
    const csv = toCsv(
      listEntries({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        profileId: profileId ? Number(profileId) : null,
        tag: url.searchParams.get('tag'),
        limit: 1000
      })
    );
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="timekeeper-export.csv"'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
