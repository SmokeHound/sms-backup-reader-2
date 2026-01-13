export type CsvCell = string | number | boolean | Date | null | undefined;

export function formatCsvCell(value: CsvCell): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return String(value);
}

export function escapeCsvCell(value: CsvCell): string {
	const text = formatCsvCell(value);

	const needsQuotes = /[\r\n,"]/g.test(text);
	const escaped = text.replace(/"/g, '""');
	return needsQuotes ? `"${escaped}"` : escaped;
}

export function rowsToCsv(
	rows: Array<Record<string, CsvCell>>,
	columns: string[]
): string {
	const header = columns.map((c) => escapeCsvCell(c)).join(',');
	const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c])).join(','));
	return [header, ...lines].join('\r\n') + '\r\n';
}
