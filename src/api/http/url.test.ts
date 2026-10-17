import { describe, expect, it } from 'vitest';
import { buildApiUrl } from './url';

describe('buildApiUrl', () => {
	it('mengirim array sebagai parameter berulang, bukan dipisah koma', () => {
		expect(buildApiUrl('https://api.test/data', { item: ['a', 'b'], resolution: '1h' })).toBe(
			'https://api.test/data?item=a&item=b&resolution=1h'
		);
	});

	it('melewatkan nilai kosong dan array kosong', () => {
		expect(buildApiUrl('https://api.test/data', { item: [], from: undefined, to: null })).toBe(
			'https://api.test/data'
		);
	});
});
