import { describe, expect, it } from 'vitest';
import { findForecastingPlant } from './constants';

describe('PLTA Forecasting', () => {
	it('menemukan Soedirman dari nama, apa pun id-nya di environment itu', () => {
		// Nama dan kode persis seperti /api/v1/plta di staging per Sep 2026.
		const plants = [
			{ id: 'grg', code: 'PLTA-GRG', name: 'PLTA Garung' },
			{ id: '4b4747da', code: 'PLTA-001', name: 'PLTA PB Soedirman (Mrica)' },
			{ id: 'wng', code: 'PLTA-WNG', name: 'PLTA Wonogiri (Gajah Mungkur)' }
		];

		expect(findForecastingPlant(plants)?.id).toBe('4b4747da');
	});

	it('mengenali nama lamanya, Mrica', () => {
		expect(findForecastingPlant([{ id: 'x', code: 'MRC', name: 'PLTA Mrica' }])?.id).toBe('x');
	});

	it('tidak memilih PLTA lain bila Soedirman tidak ada', () => {
		expect(
			findForecastingPlant([{ id: 'grg', code: 'PLTA-GRG', name: 'PLTA Garung' }])
		).toBeUndefined();
	});
});
