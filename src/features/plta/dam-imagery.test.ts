import { describe, expect, it } from 'vitest';
import {
	DAM_IMAGERY_VIEWBOX,
	HYDROLOGY_ZONES,
	getDamImagery,
	projectDamAnchor
} from './dam-imagery';

/**
 * Konversi persen → koordinat viewBox adalah satu-satunya perhitungan yang
 * tersisa setelah citra satelit diganti foto statis. Kalau ia meleset, penanda
 * hulu/bendungan/hilir menunjuk tempat yang salah di atas foto tanpa satu pun
 * tanda kesalahan.
 */
describe('projectDamAnchor', () => {
	it('memetakan 0% ke pojok kiri atas', () => {
		expect(projectDamAnchor({ xPercent: 0, yPercent: 0 })).toEqual({ x: 0, y: 0 });
	});

	it('memetakan 100% ke lebar dan tinggi viewBox', () => {
		expect(projectDamAnchor({ xPercent: 100, yPercent: 100 })).toEqual({
			x: DAM_IMAGERY_VIEWBOX.width,
			y: DAM_IMAGERY_VIEWBOX.height
		});
	});

	it('memetakan 50% ke titik tengah', () => {
		expect(projectDamAnchor({ xPercent: 50, yPercent: 50 })).toEqual({
			x: DAM_IMAGERY_VIEWBOX.width / 2,
			y: DAM_IMAGERY_VIEWBOX.height / 2
		});
	});

	it('memetakan kedua sumbu secara terpisah', () => {
		// Lebar dan tinggi viewBox berbeda, jadi persen yang sama pada dua sumbu
		// tidak boleh menghasilkan koordinat yang sama.
		expect(projectDamAnchor({ xPercent: 25, yPercent: 75 })).toEqual({ x: 400, y: 750 });
	});
});

describe('getDamImagery', () => {
	it('mengenali PLTA lewat nama maupun kode', () => {
		expect(getDamImagery({ code: 'PBS', name: 'PLTA Soedirman' })?.imageUrl).toBe(
			'/dam/soedirman.jpg'
		);
		expect(getDamImagery({ code: 'WNG', name: 'PLTA Wonogiri' })?.imageUrl).toBe(
			'/dam/wonogiri.jpg'
		);
	});

	it('mengembalikan null untuk PLTA tanpa foto', () => {
		// Halaman jatuh ke skema generik saat ini null — itulah yang membuat foto
		// bisa ditambahkan belakangan tanpa merusak PLTA lain.
		expect(getDamImagery({ code: 'XYZ', name: 'PLTA Tanpa Foto' })).toBeNull();
	});

	it('menempatkan seluruh anchor di dalam bingkai foto', () => {
		for (const plant of [
			{ code: 'PBS', name: 'PLTA Soedirman' },
			{ code: 'WNG', name: 'PLTA Wonogiri' }
		]) {
			const imagery = getDamImagery(plant);
			expect(imagery).not.toBeNull();

			for (const zone of HYDROLOGY_ZONES) {
				const { x, y } = projectDamAnchor(imagery!.anchors[zone]);
				expect(x).toBeGreaterThanOrEqual(0);
				expect(x).toBeLessThanOrEqual(DAM_IMAGERY_VIEWBOX.width);
				expect(y).toBeGreaterThanOrEqual(0);
				expect(y).toBeLessThanOrEqual(DAM_IMAGERY_VIEWBOX.height);
			}
		}
	});

	it('memakai gambar dari origin sendiri, bukan layanan citra on demand', () => {
		// Inti perubahan ini: tidak boleh ada request ke luar jaringan saat
		// halaman Hidrologi Harian dibuka.
		expect(getDamImagery({ code: 'PBS', name: 'PLTA Soedirman' })?.imageUrl).toMatch(/^\/dam\//);
	});
});
