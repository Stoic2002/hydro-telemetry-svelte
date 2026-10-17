import { describe, expect, it } from 'vitest';
import { buildDeleteRange, buildTelemetryPoints } from './points';

/**
 * Regresi yang sama seperti form hidrologi bulanan: `value` diikat ke
 * `<input type="number">`, jadi isinya angka. Kode lama memanggil
 * `row.value.trim()` dan melempar `TypeError` di luar `try`, sehingga tombol
 * Simpan tidak melakukan apa pun.
 */
describe('buildTelemetryPoints', () => {
	it('menyusun titik dari nilai angka', () => {
		expect(
			buildTelemetryPoints([
				{ date: '2026-09-09', time: '07:00', value: 231.5 },
				{ date: '2026-09-09', time: '08:00', value: 0 }
			])
		).toEqual([
			{ time: '2026-09-09T07:00:00', value: 231.5 },
			{ time: '2026-09-09T08:00:00', value: 0 }
		]);
	});

	it('menolak baris yang nilainya belum diisi', () => {
		expect(buildTelemetryPoints([{ date: '2026-09-09', time: '07:00', value: null }])).toBeNull();
	});

	it('menolak nilai yang bukan angka terhingga', () => {
		expect(
			buildTelemetryPoints([{ date: '2026-09-09', time: '07:00', value: Number.NaN }])
		).toBeNull();
	});

	it('menolak tanggal atau jam yang kosong', () => {
		expect(buildTelemetryPoints([{ date: '', time: '07:00', value: 1 }])).toBeNull();
		expect(buildTelemetryPoints([{ date: '2026-09-09', time: '', value: 1 }])).toBeNull();
	});

	it('menolak timestamp duplikat', () => {
		// Server melakukan upsert: dua baris berwaktu sama akan saling menimpa
		// diam-diam dan operator mengira keduanya tersimpan.
		expect(
			buildTelemetryPoints([
				{ date: '2026-09-09', time: '07:00', value: 1 },
				{ date: '2026-09-09', time: '07:00', value: 2 }
			])
		).toBeNull();
	});

	it('menolak daftar kosong', () => {
		expect(buildTelemetryPoints([])).toBeNull();
	});
});

describe('buildDeleteRange', () => {
	const day = (date: string, time: string) => ({ date, time });

	it('menyusun rentang tanpa zona waktu, kedua ujung apa adanya', () => {
		expect(buildDeleteRange(day('2026-08-01', '00:00'), day('2026-08-01', '23:00'))).toEqual({
			ok: true,
			start: '2026-08-01T00:00:00',
			end: '2026-08-01T23:00:00'
		});
	});

	it('menerima awal sama dengan akhir — satu titik', () => {
		expect(buildDeleteRange(day('2026-08-01', '07:00'), day('2026-08-01', '07:00')).ok).toBe(true);
	});

	it('menolak isian yang belum lengkap', () => {
		expect(buildDeleteRange(day('', '00:00'), day('2026-08-01', '23:00')).ok).toBe(false);
		expect(buildDeleteRange(day('2026-08-01', ''), day('2026-08-01', '23:00')).ok).toBe(false);
	});

	it('menolak rentang terbalik', () => {
		expect(buildDeleteRange(day('2026-08-02', '00:00'), day('2026-08-01', '23:00'))).toEqual({
			ok: false,
			error: 'Waktu akhir harus sama dengan atau setelah waktu awal'
		});
	});

	it('menolak rentang lebih dari 366 hari, menerima tepat 366 hari', () => {
		expect(buildDeleteRange(day('2025-01-01', '00:00'), day('2026-01-02', '00:00')).ok).toBe(true);
		expect(buildDeleteRange(day('2025-01-01', '00:00'), day('2026-01-02', '00:01'))).toEqual({
			ok: false,
			error: 'Rentang maksimal 366 hari'
		});
	});
});
