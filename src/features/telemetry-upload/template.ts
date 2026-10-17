import { formatLongCalendarDate } from '../../shared/lib/date';
import type { TelemetryTemplateScope } from './model';

export const TELEMETRY_TEMPLATE_SCOPE_OPTIONS: { value: TelemetryTemplateScope; label: string }[] =
	[
		{ value: 'day-hourly', label: 'Satu hari, per jam (24 baris)' },
		{ value: 'month-hourly', label: 'Satu bulan, per jam' },
		{ value: 'month-daily', label: 'Satu bulan, per hari' }
	];

export type TelemetryTemplateQuery = Record<string, string | number | undefined>;

/**
 * Query `GET /telemetry/upload-template.xlsx`, atau `null` bila tanggalnya
 * belum terisi — server mensyaratkan `tanggal` untuk harian dan `tahun` +
 * `bulan` untuk bulanan. `resolusi` hanya dikirim bila bukan bawaan (`jam`).
 */
export function telemetryTemplateQuery(
	scope: TelemetryTemplateScope,
	date: string
): TelemetryTemplateQuery | null {
	const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
	if (!match) return null;

	if (scope === 'day-hourly') return { periode: 'harian', tanggal: date };

	return {
		periode: 'bulanan',
		tahun: Number(match[1]),
		bulan: Number(match[2]),
		resolusi: scope === 'month-daily' ? 'hari' : undefined
	};
}

/** "Oktober 2026" dari tanggal `YYYY-MM-DD` — untuk keterangan cakupan bulanan. */
export function formatTemplateMonth(date: string): string {
	const formatted = formatLongCalendarDate(`${date.slice(0, 7)}-01`);
	return formatted.replace(/^01 /, '');
}

export function telemetryTemplateFilename(
	parameter: string,
	station: string,
	scope: TelemetryTemplateScope,
	date: string
): string {
	const target = station ? `${parameter}-${station}` : parameter;
	const period = scope === 'day-hourly' ? date : date.slice(0, 7);
	const suffix = scope === 'month-daily' ? '-per-hari' : '';
	return `template-${target}-${period}${suffix}.xlsx`;
}
