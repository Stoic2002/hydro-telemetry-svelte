import { describe, expect, it } from 'vitest';
import { placeMarkerLabels } from './marker-label-placement';

describe('nama penanda PLTA (temuan QA T10)', () => {
	it('penanda yang berjauhan: nama di atas', () => {
		const placements = placeMarkerLabels([
			{ id: 'a', x: 100, y: 100, text: 'Garung' },
			{ id: 'b', x: 400, y: 300, text: 'Kedungombo' }
		]);
		expect(placements.get('a')?.side).toBe('top');
		expect(placements.get('b')?.side).toBe('top');
	});

	it('dua penanda sebaris yang namanya akan bertumpuk: nama kedua pindah sisi', () => {
		// 40 px: tidak disebar (> 26 px), tetapi "PB Soedirman" ±72 px lebar.
		const placements = placeMarkerLabels([
			{ id: 'soedirman', x: 200, y: 200, text: 'PB Soedirman' },
			{ id: 'plumbungan', x: 240, y: 200, text: 'Plumbungan' }
		]);
		expect(placements.get('soedirman')?.side).toBe('top');
		expect(placements.get('plumbungan')?.side).not.toBe('top');
	});

	it('nama tidak ditulis di atas titik penanda lain', () => {
		const placements = placeMarkerLabels([
			{ id: 'atas', x: 200, y: 200, text: 'Tulis' },
			{ id: 'bawah', x: 200, y: 216, text: 'Gunung Wugul' }
		]);
		// "Gunung Wugul" di atas titiknya akan menimpa penanda "Tulis".
		expect(placements.get('bawah')?.side).not.toBe('top');
	});

	it('hasilnya tidak bergantung pada urutan daftar', () => {
		const inputs = [
			{ id: 'a', x: 200, y: 200, text: 'PB Soedirman' },
			{ id: 'b', x: 240, y: 200, text: 'Plumbungan' }
		];
		const forward = placeMarkerLabels(inputs);
		const reversed = placeMarkerLabels([...inputs].reverse());
		expect(reversed.get('a')).toEqual(forward.get('a'));
		expect(reversed.get('b')).toEqual(forward.get('b'));
	});
});
