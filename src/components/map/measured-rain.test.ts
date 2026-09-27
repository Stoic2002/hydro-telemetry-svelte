import { describe, expect, it } from 'vitest';
import type { MeasuredRain } from '$features/monitoring';
import { describeMeasuredRain } from './measured-rain';

const base: MeasuredRain = {
	pltaId: 'plta',
	status: 'dry',
	stationCount: 1,
	peak: null,
	latestTime: '2026-09-25T03:00:00Z'
};

describe('describeMeasuredRain', () => {
	it('menyebut nilai, jam WIB, dan stasiun bila PLTA punya beberapa penakar', () => {
		const description = describeMeasuredRain({
			...base,
			status: 'raining',
			stationCount: 4,
			peak: { station: 'ARR_ST02', value: 0.2, time: '2026-09-25T03:00:00Z' }
		});

		expect(description.tone).toBe('rain');
		expect(description.text).toBe('0,2 mm · 10:00 · ARR_ST02');
	});

	it('tidak mengulang nama stasiun bila penakarnya hanya satu', () => {
		const description = describeMeasuredRain({
			...base,
			status: 'raining',
			peak: { station: 'SIDOREJO', value: 1.5, time: '2026-09-25T03:00:00Z' }
		});

		expect(description.text).toBe('1,5 mm · 10:00');
	});

	it('menulis tidak hujan beserta jam pembacaan terakhir', () => {
		expect(describeMeasuredRain(base).text).toBe('Tidak hujan · 10:00');
	});

	it('tidak pernah menyebut penakar yang diam sebagai tidak hujan', () => {
		const description = describeMeasuredRain({ ...base, status: 'stale' });

		expect(description.tone).toBe('stale');
		expect(description.text).toBe('Tidak diperbarui sejak 25 Sep 10:00');
		expect(description.text).not.toMatch(/tidak hujan/i);
	});
});
