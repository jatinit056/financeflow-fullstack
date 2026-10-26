/**
 * CSV helpers (RFC 4180) with protection against CSV/formula injection:
 * a description such as "=HYPERLINK(...)" would otherwise run as a formula
 * when the export is opened in Excel or Google Sheets.
 */

const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);

  let text = String(value);
  if (FORMULA_TRIGGERS.includes(text[0])) text = `'${text}`;

  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** headers: string[]; rows: unknown[][] -> CSV text with a UTF-8 BOM so Excel reads it correctly. */
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
