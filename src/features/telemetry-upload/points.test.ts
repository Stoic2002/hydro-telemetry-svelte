import { describe, expect, it } from 'vitest';
import { buildTelemetryPoints } from './points';

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
