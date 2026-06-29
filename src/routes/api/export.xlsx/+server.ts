import { entryFiltersFromSearchParams, listEntries } from '$lib/server/repository';
import { toXlsx } from '$lib/server/export';
import { handleApiError } from '$lib/server/http';

export function GET({ url }) {
  try {
    const buffer = toXlsx(listEntries(entryFiltersFromSearchParams(url.searchParams, 1000)));
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
