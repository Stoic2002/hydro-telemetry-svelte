import { describe, expect, it } from 'vitest';
import { describeSeriesSource } from './series-source';

describe('describeSeriesSource', () => {
	it('menyebut station yang ikut diagregasi', () => {
		expect(describeSeriesSource({ station: null, aggregatedStations: ['PB01', 'PB02'] })).toBe(
			'agregasi 2 stasiun (PB01, PB02)'
		);
	});

	it('tetap menyebut agregasi walau daftar stationnya tidak dikirim', () => {
		expect(describeSeriesSource({ station: null, aggregatedStations: [] })).toBe(
			'agregasi lintas stasiun'
		);
	});

	it('membedakan seri tingkat pembangkit dari seri satu station', () => {
		expect(describeSeriesSource({ station: '', aggregatedStations: [] })).toBe(
			'tingkat pembangkit'
		);
		expect(describeSeriesSource({ station: 'SKW', aggregatedStations: [] })).toBe('stasiun SKW');
	});
});
