import { describe, expect, it } from 'vitest';
import { shiftIsoDate, timeseriesRangeDays, timeseriesRangeError } from './timeseries-range';

describe('rentang Excel time-series', () => {
	it('menghitung hari secara inklusif', () => {
		expect(timeseriesRangeDays('2026-10-01', '2026-10-01')).toBe(1);
		expect(timeseriesRangeDays('2026-10-01', '2026-10-07')).toBe(7);
	});

	it('menerima tepat 62 hari dan menolak 63', () => {
		expect(timeseriesRangeError('2026-08-01', '2026-10-01')).toBeNull();
		expect(timeseriesRangeError('2026-08-01', '2026-10-02')).toBe('Rentang maksimal 62 hari.');
	});

	it('menolak rentang terbalik dan tanggal kosong', () => {
		expect(timeseriesRangeError('2026-10-07', '2026-10-01')).toMatch(/sebelum tanggal awal/);
		expect(timeseriesRangeError('', '2026-10-01')).toBe('Isi tanggal awal dan akhir.');
	});

	it('menggeser tanggal melintasi batas bulan', () => {
		expect(shiftIsoDate('2026-10-03', -6)).toBe('2026-09-27');
	});
});
