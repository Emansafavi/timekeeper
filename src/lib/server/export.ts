import { zipSync, strToU8 } from 'fflate';
import type { TimeEntry } from '$lib/types';

export function exportRows(entries: TimeEntry[]) {
  return entries.map((entry) => ({
    date: entry.startAt.slice(0, 10),
    start_time: entry.startAt,
    end_time: entry.endAt,
    duration_hours: Math.round((entry.durationSeconds / 3600) * 100) / 100,
    duration_seconds: entry.durationSeconds,
    profile: entry.profileName,
    tags: entry.tags.join(', '),
    note: entry.note
  }));
}

export function toCsv(entries: TimeEntry[]): string {
  const rows = exportRows(entries);
  const headers = ['date', 'start_time', 'end_time', 'duration_hours', 'duration_seconds', 'profile', 'tags', 'note'];
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(','))].join('\n');
}

export function toXlsx(entries: TimeEntry[]): Buffer {
  const rows = exportRows(entries);
  const headers = ['date', 'start_time', 'end_time', 'duration_hours', 'duration_seconds', 'profile', 'tags', 'note'];
  const matrix = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))];
  const worksheetRows = matrix
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex + 1)}${rowIndex + 1}`;
          if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(value ?? ''))}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Time entries" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${worksheetRows}</sheetData>
</worksheet>`)
  };

  return Buffer.from(zipSync(files));
}

function columnName(index: number): string {
  let name = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
