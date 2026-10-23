import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_DAM_FRAME,
	HYDROLOGY_ZONES,
	fitDamViewBox,
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
			'/dam/soedirman.avif'
		);
		expect(getDamImagery({ code: 'WNG', name: 'PLTA Wonogiri' })?.imageUrl).toBe(
			'/dam/wonogiri.avif'
		);
	});

	it('memberi citra untuk seluruh 13 PLTA dari backend, masing-masing berbeda', () => {
		// Nama dan kode persis seperti `/api/v1/plta` per 23 Sep 2026. Identitas
		// yang terlalu longgar akan membuat dua PLTA berbagi satu citra.
		const plants = [
			{ code: 'PLTA-001', name: 'PLTA PB Soedirman (Mrica)' },
			{ code: 'PLTA-WNG', name: 'PLTA Wonogiri (Gajah Mungkur)' },
			{ code: 'PLTA-KDO', name: 'PLTA Kedungombo' },
			{ code: 'PLTA-WDL', name: 'PLTA Wadaslintang' },
			{ code: 'PLTA-SMP', name: 'PLTA Sempor' },
			{ code: 'PLTA-SDJ', name: 'PLTA Sidorejo' },
			{ code: 'PLTA-KLB', name: 'PLTA Klambu' },
			{ code: 'PLTA-PJKL', name: 'PLTA Pejengkolan' },
			{ code: 'PLTA-GRG', name: 'PLTA Garung' },
			{ code: 'PLTA-JLO', name: 'PLTA Jelok' },
			{ code: 'PLTA-TMO', name: 'PLTA Timo' },
			{ code: 'PLTA-KTG1', name: 'PLTA Ketenger 1' },
			{ code: 'PLTA-TLS', name: 'PLTA Tulis' }
		];
		const images = plants.map((plant) => getDamImagery(plant)?.imageUrl);

		expect(images.every(Boolean)).toBe(true);
		expect(new Set(images).size).toBe(plants.length);

		// Salah ketik nama atau ekstensi baru ketahuan di browser — halaman diam-diam
		// jatuh ke skema generik. Di sini ketahuan sebelum rilis.
		for (const image of images) {
			expect(existsSync(`static${image}`), image).toBe(true);
		}
	});

	it('mengenali PLTA dengan nama dan kode persis seperti dari backend', () => {
		// Diambil dari `/api/v1/plta` per 23 Sep 2026.
		expect(getDamImagery({ code: 'PLTA-KDO', name: 'PLTA Kedungombo' })?.imageUrl).toBe(
			'/dam/kedungombo.avif'
		);
		expect(getDamImagery({ code: 'PLTA-WDL', name: 'PLTA Wadaslintang' })?.imageUrl).toBe(
			'/dam/wadaslintang.avif'
		);
		expect(getDamImagery({ code: 'PLTA-SMP', name: 'PLTA Sempor' })?.imageUrl).toBe(
			'/dam/sempor.avif'
		);
		expect(getDamImagery({ code: 'PLTA-SDJ', name: 'PLTA Sidorejo' })?.imageUrl).toBe(
			'/dam/sidorejo.avif'
		);
		expect(getDamImagery({ code: 'PLTA-KLB', name: 'PLTA Klambu' })?.imageUrl).toBe(
			'/dam/klambu.avif'
		);
		expect(getDamImagery({ code: 'PLTA-PJKL', name: 'PLTA Pejengkolan' })?.imageUrl).toBe(
			'/dam/pejengkolan.avif'
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
			{ code: 'WNG', name: 'PLTA Wonogiri' },
			{ code: 'PLTA-KDO', name: 'PLTA Kedungombo' },
			{ code: 'PLTA-WDL', name: 'PLTA Wadaslintang' },
			{ code: 'PLTA-SMP', name: 'PLTA Sempor' },
			{ code: 'PLTA-SDJ', name: 'PLTA Sidorejo' },
			{ code: 'PLTA-KLB', name: 'PLTA Klambu' },
			{ code: 'PLTA-PJKL', name: 'PLTA Pejengkolan' },
			{ code: 'PLTA-GRG', name: 'PLTA Garung' },
			{ code: 'PLTA-JLO', name: 'PLTA Jelok' },
			{ code: 'PLTA-TMO', name: 'PLTA Timo' },
			{ code: 'PLTA-KTG1', name: 'PLTA Ketenger 1' },
			{ code: 'PLTA-TLS', name: 'PLTA Tulis' }
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

describe('batas hasil telusur', () => {
	function contains(points: readonly (readonly [number, number])[], x: number, y: number) {
		let inside = false;
		for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
			const [xi, yi] = points[i];
			const [xj, yj] = points[j];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		}
		return inside;
	}

	it('menempatkan penanda di dalam arsiran zonanya sendiri', () => {
		// Menelusur ulang sebuah batas mudah membuat penanda jatuh di luarnya —
		// garis alir lalu menunjuk ke daratan, bukan ke waduk atau sungai.
		// Soedirman sengaja tidak masuk: penanda hilirnya sudah berada sedikit di
		// luar batasnya sejak batas itu ditelusuri, dan belum diputuskan mana yang
		// digeser.
		for (const plant of [
			{ code: 'PLTA-WNG', name: 'PLTA Wonogiri (Gajah Mungkur)' },
			{ code: 'PLTA-KDO', name: 'PLTA Kedungombo' },
			{ code: 'PLTA-WDL', name: 'PLTA Wadaslintang' },
			{ code: 'PLTA-SMP', name: 'PLTA Sempor' },
			{ code: 'PLTA-SDJ', name: 'PLTA Sidorejo' },
			{ code: 'PLTA-KLB', name: 'PLTA Klambu' },
			{ code: 'PLTA-PJKL', name: 'PLTA Pejengkolan' },
			{ code: 'PLTA-GRG', name: 'PLTA Garung' },
			{ code: 'PLTA-JLO', name: 'PLTA Jelok' },
			{ code: 'PLTA-TMO', name: 'PLTA Timo' },
			{ code: 'PLTA-KTG1', name: 'PLTA Ketenger 1' },
			{ code: 'PLTA-TLS', name: 'PLTA Tulis' }
		]) {
			const imagery = getDamImagery(plant)!;
			for (const zone of HYDROLOGY_ZONES) {
				const anchor = imagery.anchors[zone];
				expect(anchor.field?.kind, `${plant.name} ${zone}`).toBe('outline');
				if (anchor.field?.kind !== 'outline') continue;
				expect(
					contains(anchor.field.points, anchor.xPercent, anchor.yPercent),
					`${plant.name} ${zone}`
				).toBe(true);
			}
		}
	});
});

describe('resolveDamZoneField', () => {
	it('memakai elips bawaan bila anchor tidak menyebutkan bentuknya', () => {
		// Anchor sintetis: PLTA yang arsirannya belum ditelusuri tetap aman.
		const shape = resolveDamZoneField('dam', { xPercent: 50, yPercent: 50 }, DEFAULT_DAM_FRAME);

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

describe('fitDamViewBox', () => {
	const frame = { width: 1600, height: 667 };

	function contains(
		box: ReturnType<typeof fitDamViewBox>,
		point: { x: number; y: number },
		paddingUnits: number
	) {
		return (
			point.x - paddingUnits >= box.x - 1e-6 &&
			point.x + paddingUnits <= box.x + box.width + 1e-6 &&
			point.y - paddingUnits >= box.y - 1e-6 &&
			point.y + paddingUnits <= box.y + box.height + 1e-6
		);
	}

	it('sama dengan potongan tengah biasa bila ketiga penanda sudah masuk', () => {
		const points = [
			{ x: 600, y: 300 },
			{ x: 800, y: 330 },
			{ x: 1000, y: 360 }
		];

		const box = fitDamViewBox(frame, points, 960, 400);

		expect(box.x).toBe(0);
		expect(box.width).toBe(1600);
		expect(box.width / box.height).toBeCloseTo(960 / 400);
	});

	// Di ponsel 375 px wadahnya 349 × 220: `slice` biasa hanya memperlihatkan
	// ±1058 dari 1600 satuan lebar, dan penanda di tepi citra hilang.
	it('memasukkan seluruh penanda di wadah sempit, termasuk yang di tepi citra', () => {
		const points = [
			{ x: 40, y: 280 },
			{ x: 820, y: 330 },
			{ x: 1560, y: 360 }
		];

		const box = fitDamViewBox(frame, points, 349, 220, 28);
		const paddingUnits = (28 * box.width) / 349;

		expect(box.width / box.height).toBeCloseTo(349 / 220);
		for (const point of points) expect(contains(box, point, paddingUnits)).toBe(true);
	});

	it('menggeser potongan ke arah penanda tanpa memperkecil citra bila cukup', () => {
		const points = [
			{ x: 1100, y: 300 },
			{ x: 1300, y: 320 },
			{ x: 1500, y: 340 }
		];

		const box = fitDamViewBox(frame, points, 349, 220, 28);

		expect(box.height).toBeCloseTo(667);
		expect(box.x + box.width).toBeCloseTo(1600);
		for (const point of points) expect(contains(box, point, 0)).toBe(true);
	});

	it('memperlihatkan ketiga penanda setiap citra bendungan di layar ponsel', () => {
		const names = [
			'Soedirman',
			'Wonogiri',
			'Kedungombo',
			'Wadaslintang',
			'Sempor',
			'Sidorejo',
			'Klambu',
			'Pejengkolan',
			'Garung',
			'Jelok',
			'Timo',
			'Ketenger',
			'Tulis'
		];

		for (const name of names) {
			const imagery = getDamImagery({ code: '', name: `PLTA ${name}` });
			expect(imagery, name).not.toBeNull();
			if (!imagery) continue;

			const points = HYDROLOGY_ZONES.map((zone) =>
				projectDamAnchor(imagery.anchors[zone], imagery.frame)
			);
			const box = fitDamViewBox(imagery.frame, points, 349, 220, 28);
			const paddingUnits = (28 * box.width) / 349;
			for (const point of points) expect(contains(box, point, paddingUnits), name).toBe(true);
		}
	});

	it('memakai seluruh bingkai sebelum ukuran wadah diketahui', () => {
		expect(fitDamViewBox(frame, [{ x: 10, y: 10 }], 0, 0)).toEqual({
			x: 0,
			y: 0,
			width: 1600,
			height: 667
		});
	});
});
