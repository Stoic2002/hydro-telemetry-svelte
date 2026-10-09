import { describe, expect, it } from 'vitest';
import { describeTagBounds, parseTagBounds } from './tag-bounds';

describe('parseTagBounds', () => {
	it('menerima rentang yang batas bawahnya lebih kecil', () => {
		expect(parseTagBounds(0, 120)).toEqual({ ok: true, bounds: { minValid: 0, maxValid: 120 } });
	});

	it('menolak batas bawah yang sama dengan atau melebihi batas atas', () => {
		expect(parseTagBounds(5, 5)).toMatchObject({ ok: false });
		expect(parseTagBounds(10, 2)).toMatchObject({ ok: false });
	});

	it('menerima satu sisi saja, dan kedua sisi kosong sebagai pencabutan batas', () => {
		expect(parseTagBounds(null, 120)).toEqual({
			ok: true,
			bounds: { minValid: null, maxValid: 120 }
		});
		expect(parseTagBounds(null, null)).toEqual({
			ok: true,
			bounds: { minValid: null, maxValid: null }
		});
	});

	it('menerima nol dan angka negatif sebagai batas yang sah', () => {
		expect(parseTagBounds(-655, 0)).toEqual({ ok: true, bounds: { minValid: -655, maxValid: 0 } });
	});

	it('menganggap nilai yang bukan angka terhingga sebagai kosong', () => {
		expect(parseTagBounds(Number.NaN, 5)).toEqual({
			ok: true,
			bounds: { minValid: null, maxValid: 5 }
		});
	});
});

describe('describeTagBounds', () => {
	it('merangkum rentang dua sisi dan satu sisi', () => {
		expect(describeTagBounds({ minValid: 0, maxValid: 120 })).toBe('0 – 120');
		expect(describeTagBounds({ minValid: 0, maxValid: null })).toBe('≥ 0');
		expect(describeTagBounds({ minValid: null, maxValid: 59.8 })).toBe('≤ 59,80');
	});

	it('mengembalikan null bila tanpa batas', () => {
		expect(describeTagBounds({ minValid: null, maxValid: null })).toBeNull();
	});
});
