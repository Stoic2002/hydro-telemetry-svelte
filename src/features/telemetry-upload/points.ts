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

/**
 * Parameter konstanta (`const_tma_limpas`, `const_swc`, …) tidak berdimensi
 * waktu: server menolaknya di template dan unggah Excel (400) dan hanya
 * menerimanya lewat input manual. Nilai terbaru yang dipakai — tanggalnya
 * hanya kunci simpan (keputusan rapat tim 27 Okt 2026: tanpa pemilih tanggal).
 */
export function isConstantParameter(parameter: string): boolean {
	return parameter.startsWith('const_');
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Satu titik konstanta pada saat ini (WIB, tanpa zona — dibaca server sebagai
 * WIB), supaya nilai baru selalu menjadi yang terbaru. `null` bila nilainya
 * kosong.
 */
export function buildConstantPoint(
	value: number | null,
	now: Date = new Date()
): TelemetryUploadPoint[] | null {
	if (value === null || !Number.isFinite(value)) return null;
	const time = new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 19);
	return [{ time, value }];
}

/** Batas server untuk satu penghapusan — pagar salah ketik, bukan batas teknis. */
export const MAX_DELETE_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TelemetryRangeBoundary {
	date: string;
	time: string;
}

export type TelemetryDeleteRange =
	{ ok: true; start: string; end: string } | { ok: false; error: string };

/**
 * Rentang penghapusan data manual, atau alasan rentang itu pasti ditolak
 * server — supaya tidak dikirim sama sekali.
 *
 * Kedua ujung inklusif di server, jadi `start` = `end` sah (satu titik).
 * Waktu tanpa zona dibaca server sebagai WIB; selisihnya dihitung di UTC
 * hanya agar tidak terpengaruh zona waktu browser.
 */
export function buildDeleteRange(
	from: TelemetryRangeBoundary,
	to: TelemetryRangeBoundary
): TelemetryDeleteRange {
	if (!from.date || !from.time || !to.date || !to.time) {
		return { ok: false, error: 'Lengkapi tanggal dan jam awal serta akhir' };
	}

	const start = `${from.date}T${from.time}:00`;
	const end = `${to.date}T${to.time}:00`;
	const startMs = Date.parse(`${start}Z`);
	const endMs = Date.parse(`${end}Z`);

	if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
		return { ok: false, error: 'Tanggal atau jam tidak valid' };
	}
	if (endMs < startMs) {
		return { ok: false, error: 'Waktu akhir harus sama dengan atau setelah waktu awal' };
	}
	if (endMs - startMs > MAX_DELETE_RANGE_DAYS * DAY_MS) {
		return { ok: false, error: `Rentang maksimal ${MAX_DELETE_RANGE_DAYS} hari` };
	}

	return { ok: true, start, end };
}
