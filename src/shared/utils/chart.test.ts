import { describe, expect, it } from 'vitest';
import { chartValueDomain, timeAxisFormatter, valueAxisTicks, minimumAxisSpan } from './chart';

describe('chartValueDomain', () => {
	it('memberi rentang aman saat tidak ada nilai', () => {
		expect(chartValueDomain([])).toEqual([0, 1]);
		expect(chartValueDomain([Number.NaN, Number.POSITIVE_INFINITY])).toEqual([0, 1]);
	});

	it('tidak memaku dasar sumbu di nol untuk nilai yang jauh di atas nol', () => {
		const [minimum, maximum] = chartValueDomain([45, 52, 62]);

		expect(minimum).toBeGreaterThan(40);
		expect(maximum).toBeGreaterThan(62);
		// Data harus mengisi sebagian besar tinggi grafik, bukan terjepit di atas.
		expect((62 - 45) / (maximum - minimum)).toBeGreaterThan(0.7);
	});

	it('menaruh garis datar di tengah dengan jendela yang proporsional', () => {
		const [minimum, maximum] = chartValueDomain([231.5, 231.5]);

		expect(minimum).toBeLessThan(231.5);
		expect(maximum).toBeGreaterThan(231.5);
		// Jendela tetap kecil relatif terhadap nilainya, dan nilainya di tengah.
		expect(maximum - minimum).toBeLessThan(231.5 * 0.1);
		expect((minimum + maximum) / 2).toBeCloseTo(231.5, 5);
	});

	it('menjaga rentang nyaris datar tetap mengisi tinggi grafik', () => {
		const [minimum, maximum] = chartValueDomain([231.0, 231.6, 232.0]);

		expect((232 - 231) / (maximum - minimum)).toBeGreaterThan(0.7);
	});

	it('tidak menurunkan dasar sumbu di bawah nol untuk data non-negatif', () => {
		expect(chartValueDomain([0, 4, 10])[0]).toBe(0);
	});

	it('mengizinkan dasar negatif kalau datanya memang negatif', () => {
		expect(chartValueDomain([-8, -2])[0]).toBeLessThan(-8);
	});
});

describe('valueAxisTicks', () => {
	it('memberi desimal secukupnya agar tick bertetangga tidak berlabel sama', () => {
		const { ticks, fractionDigits } = valueAxisTicks([223.08, 223.32]);

		expect(fractionDigits).toBe(2);
		const labels = ticks.map((tick) => tick.toFixed(fractionDigits));
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('tanpa desimal bila tick-nya bilangan bulat, berapa pun besarnya', () => {
		expect(valueAxisTicks([0, 900]).fractionDigits).toBe(0);
		expect(valueAxisTicks([4.1, 4.9]).fractionDigits).toBe(1);
	});

	it('aman untuk rentang datar', () => {
		expect(valueAxisTicks([5, 5]).fractionDigits).toBe(0);
	});
});

describe('timeAxisFormatter', () => {
	// 07 Okt 2026 14:00 WIB = 07:00 UTC; tengah malam WIB = 17:00 UTC hari sebelumnya.
	const afternoon = new Date('2026-10-07T07:00:00Z');
	const midnight = new Date('2026-10-06T17:00:00Z');

	it('rentang sehari menampilkan jam, dan tanggal di tick tengah malam', () => {
		const format = timeAxisFormatter(24 * 60 * 60 * 1000);

		expect(format(afternoon)).toBe('14:00');
		expect(format(midnight)).toBe('07 Okt');
	});

	it('rentang beberapa hari menampilkan tanggal dan jam', () => {
		expect(timeAxisFormatter(7 * 24 * 60 * 60 * 1000)(afternoon)).toBe('07 Okt 14:00');
	});

	it('rentang panjang cukup tanggal', () => {
		expect(timeAxisFormatter(30 * 24 * 60 * 60 * 1000)(afternoon)).toBe('07 Okt');
	});
});

describe('rentang sumbu minimum per satuan', () => {
	it('melebarkan TMA yang bergerak beberapa sentimeter menjadi 0,2 m', () => {
		const [low, high] = chartValueDomain([230.32, 230.36], minimumAxisSpan('mdpl'));
		expect(high - low).toBeCloseTo(0.2);
		expect((low + high) / 2).toBeCloseTo(230.34);
	});

	it('tidak menyempitkan rentang yang sudah lebar', () => {
		const domain = chartValueDomain([229, 231], minimumAxisSpan('mdpl'));
		expect(domain[1] - domain[0]).toBeGreaterThan(2);
	});

	it('satuan lain mengikuti datanya', () => {
		expect(minimumAxisSpan('m3/s')).toBe(0);
		expect(minimumAxisSpan(null)).toBe(0);
		expect(minimumAxisSpan(' MDPL ')).toBe(0.2);
	});
});
