import { describe, expect, it } from 'vitest';
import { displayUnit } from './unit';

describe('displayUnit', () => {
	it('mengganti satuan ASCII dari server dengan simbolnya', () => {
		expect(displayUnit('m3')).toBe('m³');
		expect(displayUnit('m3/s')).toBe('m³/s');
		expect(displayUnit('m3/kWh')).toBe('m³/kWh');
		expect(displayUnit('degC')).toBe('°C');
	});

	it('membiarkan satuan lain apa adanya', () => {
		expect(displayUnit('mdpl')).toBe('mdpl');
		expect(displayUnit('MWh')).toBe('MWh');
		expect(displayUnit('mm')).toBe('mm');
		expect(displayUnit('%')).toBe('%');
	});

	it('meneruskan satuan kosong', () => {
		expect(displayUnit(null)).toBeUndefined();
		expect(displayUnit(undefined)).toBeUndefined();
	});
});
