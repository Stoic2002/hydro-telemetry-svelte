import { describe, expect, it } from 'vitest';
import { forecastAccuracyWindow } from './accuracy';

describe('jendela akurasi forecast', () => {
	it('mundur 30 hari dari jam penuh terakhir', () => {
		const window = forecastAccuracyWindow(Date.parse('2026-10-09T03:47:12Z'));

		expect(window).toEqual({
			start: '2026-09-09T03:00:00.000Z',
			end: '2026-10-09T03:00:00.000Z'
		});
	});

	it('stabil di dalam jam yang sama, supaya kunci query tidak berubah tiap render', () => {
		expect(forecastAccuracyWindow(Date.parse('2026-10-09T03:01:00Z'))).toEqual(
			forecastAccuracyWindow(Date.parse('2026-10-09T03:59:00Z'))
		);
	});
});
