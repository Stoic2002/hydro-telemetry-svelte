import { describe, expect, it } from 'vitest';
import {
	DEFAULT_DAM_FRAME,
	HYDROLOGY_ZONES,
	getDamImagery,
	projectDamAnchor,
	resolveDamZoneField
} from './dam-imagery';

/**
 * Konversi persen → koordinat viewBox adalah satu-satunya perhitungan yang
 * tersisa setelah citra satelit diganti foto statis. Kalau ia meleset, penanda
 * hulu/bendungan/hilir menunjuk tempat yang salah di atas foto tanpa satu pun
 * tanda kesalahan.
 */
describe('projectDamAnchor', () => {
	it('memetakan 0% ke pojok kiri atas', () => {
		expect(projectDamAnchor({ xPercent: 0, yPercent: 0 }, DEFAULT_DAM_FRAME)).toEqual({
			x: 0,
			y: 0
		});
	});

	it('memetakan 100% ke lebar dan tinggi viewBox', () => {
		expect(projectDamAnchor({ xPercent: 100, yPercent: 100 }, DEFAULT_DAM_FRAME)).toEqual({
			x: DEFAULT_DAM_FRAME.width,
			y: DEFAULT_DAM_FRAME.height
		});
	});

	it('memetakan 50% ke titik tengah', () => {
		expect(projectDamAnchor({ xPercent: 50, yPercent: 50 }, DEFAULT_DAM_FRAME)).toEqual({
			x: DEFAULT_DAM_FRAME.width / 2,
			y: DEFAULT_DAM_FRAME.height / 2
		});
	});

	it('memetakan kedua sumbu secara terpisah', () => {
		// Lebar dan tinggi viewBox berbeda, jadi persen yang sama pada dua sumbu
		// tidak boleh menghasilkan koordinat yang sama.
		expect(projectDamAnchor({ xPercent: 25, yPercent: 75 }, DEFAULT_DAM_FRAME)).toEqual({
			x: 400,
			y: 750
		});
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
				const { x, y } = projectDamAnchor(imagery!.anchors[zone], imagery!.frame);
				expect(x).toBeGreaterThanOrEqual(0);
				expect(x).toBeLessThanOrEqual(imagery!.frame.width);
				expect(y).toBeGreaterThanOrEqual(0);
				expect(y).toBeLessThanOrEqual(imagery!.frame.height);
			}
		}
	});

	it('memakai gambar dari origin sendiri, bukan layanan citra on demand', () => {
		// Inti perubahan ini: tidak boleh ada request ke luar jaringan saat
		// halaman Hidrologi Harian dibuka.
		expect(getDamImagery({ code: 'PBS', name: 'PLTA Soedirman' })?.imageUrl).toMatch(/^\/dam\//);
	});
});

describe('resolveDamZoneField', () => {
	it('memakai elips bawaan bila anchor tidak menyebutkan bentuknya', () => {
		const wonogiri = getDamImagery({ code: 'WNG', name: 'PLTA Wonogiri' });
		const shape = resolveDamZoneField('dam', wonogiri!.anchors.dam, wonogiri!.frame);

		expect(wonogiri!.anchors.dam.field).toBeUndefined();
		expect(shape.kind).toBe('ellipse');
	});

	it('memakai batas hasil telusur bila anchor menyebutkannya', () => {
		const soedirman = getDamImagery({ code: 'PBS', name: 'PLTA Soedirman' });
		const shape = resolveDamZoneField('upstream', soedirman!.anchors.upstream, soedirman!.frame);

		// Batas waduk hasil telusur punya puluhan titik; elips tidak akan pernah
		// menghasilkan bentuk seperti itu.
		expect(shape.kind).toBe('polygon');
		if (shape.kind !== 'polygon') return;
		expect(shape.points.split(' ').length).toBeGreaterThan(20);
	});

	it('mengubah persen batas menjadi satuan viewBox pada sumbu yang benar', () => {
		const shape = resolveDamZoneField(
			'dam',
			{
				xPercent: 50,
				yPercent: 50,
				field: {
					kind: 'outline',
					points: [
						[0, 0],
						[100, 0],
						[100, 100]
					]
				}
			},
			DEFAULT_DAM_FRAME
		);

		expect(shape).toEqual({
			kind: 'polygon',
			points: `0,0 ${DEFAULT_DAM_FRAME.width},0 ${DEFAULT_DAM_FRAME.width},${DEFAULT_DAM_FRAME.height}`
		});
	});

	it('mengubah persen elips menjadi satuan viewBox pada sumbu yang benar', () => {
		const shape = resolveDamZoneField(
			'dam',
			{
				xPercent: 50,
				yPercent: 50,
				field: { kind: 'ellipse', widthPercent: 25, heightPercent: 10, angle: 12 }
			},
			DEFAULT_DAM_FRAME
		);

		expect(shape).toEqual({
			kind: 'ellipse',
			cx: DEFAULT_DAM_FRAME.width * 0.5,
			cy: DEFAULT_DAM_FRAME.height * 0.5,
			rx: DEFAULT_DAM_FRAME.width * 0.25,
			ry: DEFAULT_DAM_FRAME.height * 0.1,
			angle: 12
		});
	});
});
