import { listEntries } from '$lib/server/repository';
import { toXlsx } from '$lib/server/export';
import { handleApiError } from '$lib/server/http';

export function GET({ url }) {
  try {
    const profileId = url.searchParams.get('profileId');
    const buffer = toXlsx(
      listEntries({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        profileId: profileId ? Number(profileId) : null,
        tag: url.searchParams.get('tag'),
        limit: 1000
      })
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="timekeeper-export.xlsx"'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
