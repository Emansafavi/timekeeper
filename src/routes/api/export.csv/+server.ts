import { entryFiltersFromSearchParams, listEntries } from '$lib/server/repository';
import { toCsv } from '$lib/server/export';
import { handleApiError } from '$lib/server/http';

export function GET({ url }) {
  try {
    const csv = toCsv(listEntries(entryFiltersFromSearchParams(url.searchParams, 1000)));
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
