import { describe, expect, it } from 'vitest';
import {
	fitAboveOverlay,
	RIGHT_PANEL_GUTTER_PX,
	horizontalShiftForWidth,
	pixelShiftToLongitude
} from './projection';

describe('pixelShiftToLongitude', () => {
	it('menghasilkan selisih bujur yang mengecil saat skala membesar', () => {
		const padaSkalaKecil = pixelShiftToLongitude(114, 10_000);
		const padaSkalaBesar = pixelShiftToLongitude(114, 40_000);

		// Pergeseran 114 piksel berarti selisih bujur lebih kecil bila petanya
		// digambar lebih besar; inilah yang membuat hasilnya konsisten di layar
		// sempit maupun lebar.
		expect(padaSkalaBesar).toBeLessThan(padaSkalaKecil);
		expect(padaSkalaBesar).toBeCloseTo(padaSkalaKecil / 4, 6);
	});

	it('membalik rumus proyeksi Mercator dengan benar', () => {
		const scale = 22_000;
		const shiftPx = 114;
		const derajat = pixelShiftToLongitude(shiftPx, scale);

		// x = skala * (bujur dalam radian); jadi derajat * pi/180 * skala harus
		// kembali ke jumlah piksel semula.
		expect(((derajat * Math.PI) / 180) * scale).toBeCloseTo(shiftPx, 6);
	});

	it('tidak menghasilkan nilai tak hingga untuk skala tidak wajar', () => {
		expect(pixelShiftToLongitude(114, 0)).toBe(0);
		expect(pixelShiftToLongitude(114, Number.NaN)).toBe(0);
		expect(pixelShiftToLongitude(114, -100)).toBe(0);
	});
});

describe('horizontalShiftForWidth', () => {
	it('tidak menggeser apa pun di layar sempit', () => {
		// Di lebar ini panel melayang hampir menutupi peta; menggeser justru
		// membuang daratan keluar bingkai.
		expect(horizontalShiftForWidth(375)).toBe(0);
		expect(horizontalShiftForWidth(639)).toBe(0);
	});

	it('menggeser setengah lebar panel pada layar lebar', () => {
		expect(horizontalShiftForWidth(1200)).toBe(RIGHT_PANEL_GUTTER_PX / 2);
	});

	it('tidak pernah melebihi seperempat lebar peta', () => {
		for (const width of [640, 700, 800, 1200, 1480]) {
			expect(horizontalShiftForWidth(width)).toBeLessThanOrEqual(width / 4);
		}
	});
});

/** Temuan QA T7: kartu ringkasan menutupi Wonogiri dan separuh selatan peta. */
describe('fitAboveOverlay', () => {
	it('tidak mengubah apa pun tanpa kartu', () => {
		expect(
			fitAboveOverlay({ mapHeight: 560, overlayHeight: 0, contentTop: 100, contentBottom: 500 })
		).toEqual({ scaleFactor: 1, offsetY: 0 });
	});

	it('hanya menggeser naik bila isinya muat di atas kartu', () => {
		const fit = fitAboveOverlay({
			mapHeight: 560,
			overlayHeight: 120,
			contentTop: 120,
			contentBottom: 450,
			padding: 10
		});

		expect(fit.scaleFactor).toBe(1);
		// Dasar isi (450) naik ke batas atas kartu: 560 − 120 − 10 = 430.
		expect(fit.offsetY).toBe(-20);
	});

	it('tidak menggeser bila isinya sudah di atas kartu', () => {
		expect(
			fitAboveOverlay({ mapHeight: 560, overlayHeight: 80, contentTop: 60, contentBottom: 400 })
		).toEqual({ scaleFactor: 1, offsetY: 0 });
	});

	it('memperkecil secukupnya bila isinya lebih tinggi dari sisa ruang', () => {
		const fit = fitAboveOverlay({
			mapHeight: 560,
			overlayHeight: 230,
			contentTop: 100,
			contentBottom: 500,
			padding: 10
		});
		const middle = 280;
		const top = middle + (100 - middle) * fit.scaleFactor + fit.offsetY;
		const bottom = middle + (500 - middle) * fit.scaleFactor + fit.offsetY;

		expect(fit.scaleFactor).toBeCloseTo(310 / 400);
		expect(top).toBeCloseTo(10);
		expect(bottom).toBeCloseTo(320);
	});
});
