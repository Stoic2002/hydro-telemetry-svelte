import { describe, expect, it } from 'vitest';
import { moveItem } from './array';

describe('moveItem', () => {
	it('memindahkan ke bawah dan ke atas', () => {
		expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
		expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
	});

	it('menjepit tujuan ke ujung larik', () => {
		expect(moveItem(['a', 'b', 'c'], 1, 99)).toEqual(['a', 'c', 'b']);
		expect(moveItem(['a', 'b', 'c'], 1, -5)).toEqual(['b', 'a', 'c']);
	});

	it('mengabaikan asal di luar rentang dan tidak mengubah larik asal', () => {
		const items = ['a', 'b'];

		expect(moveItem(items, 5, 0)).toEqual(['a', 'b']);
		moveItem(items, 0, 1);
		expect(items).toEqual(['a', 'b']);
	});
});
