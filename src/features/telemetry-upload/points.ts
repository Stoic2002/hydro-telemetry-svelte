import type { TelemetryUploadPoint } from './model';

export const MAX_TELEMETRY_POINTS = 20_000;

/**
 * Satu baris isian manual.
 *
 * `value` bertipe `number | null`, bukan string, karena diikat ke
 * `<input type="number">` — Svelte mengembalikan angka dari binding itu, dan
 * `null` saat isiannya dikosongkan.
 */
export interface TelemetryPointRow {
	date: string;
	time: string;
	value: number | null;
}

/**
 * Mengubah baris jadi payload, atau `null` bila ada yang belum lengkap.
 *
 * Timestamp duplikat ditolak di sini: server melakukan upsert, jadi dua baris
 * dengan waktu sama akan saling menimpa diam-diam dan operator mengira keduanya
 * tersimpan.
 */
export function buildTelemetryPoints(rows: TelemetryPointRow[]): TelemetryUploadPoint[] | null {
	if (rows.length === 0 || rows.length > MAX_TELEMETRY_POINTS) return null;

	const points: TelemetryUploadPoint[] = [];
	const seenTimestamps: Record<string, true> = {};

	for (const row of rows) {
		const { value } = row;
		if (!row.date || !row.time || value === null || !Number.isFinite(value)) return null;

		const time = `${row.date}T${row.time}:00`;
		if (seenTimestamps[time]) return null;
		seenTimestamps[time] = true;
		points.push({ time, value });
	}

	return points;
}
