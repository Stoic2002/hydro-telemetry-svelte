import { describe, expect, it } from 'vitest';
import { MARKER_MIN_DISTANCE, spreadMarkers } from './marker-spread';

function distance(first: { x: number; y: number }, second: { x: number; y: number }) {
	return Math.hypot(first.x - second.x, first.y - second.y);
}

describe('penyebaran penanda yang berdempet', () => {
	it('tidak menggeser penanda yang sudah cukup jauh', () => {
		const result = spreadMarkers([
			{ id: 'a', x: 0, y: 0 },
			{ id: 'b', x: 100, y: 0 }
		]);

		expect(result.every((marker) => !marker.isDisplaced)).toBe(true);
		expect(result[1]).toMatchObject({ x: 100, y: 0, anchorX: 100, anchorY: 0 });
	});

	it('memisahkan penanda berdempet minimal sejauh jarak minimum', () => {
		const result = spreadMarkers([
			{ id: 'a', x: 50, y: 50 },
			{ id: 'b', x: 54, y: 52 },
			{ id: 'c', x: 52, y: 47 }
		]);

		expect(result.every((marker) => marker.isDisplaced)).toBe(true);
		for (let first = 0; first < result.length; first += 1) {
			for (let second = first + 1; second < result.length; second += 1) {
				expect(distance(result[first], result[second])).toBeGreaterThanOrEqual(
					MARKER_MIN_DISTANCE - 1e-9
				);
			}
		}
	});

	it('menyimpan posisi asli untuk garis penghubung', () => {
		const [first] = spreadMarkers([
			{ id: 'a', x: 10, y: 10 },
			{ id: 'b', x: 12, y: 10 }
		]);

		expect(first).toMatchObject({ anchorX: 10, anchorY: 10 });
	});

	it('mempertahankan arah asli: yang di barat tetap di barat', () => {
		const [west, east] = spreadMarkers([
			{ id: 'barat', x: 40, y: 50 },
			{ id: 'timur', x: 45, y: 50 }
		]);

		expect(west.x).toBeLessThan(east.x);
	});

	it('menyebar penanda yang tepat bertumpuk secara stabil', () => {
		const points = [
			{ id: 'b', x: 0, y: 0 },
			{ id: 'a', x: 0, y: 0 }
		];

		expect(spreadMarkers(points)).toEqual(spreadMarkers(points));
		expect(distance(...(spreadMarkers(points) as [never, never]))).toBeGreaterThanOrEqual(
			MARKER_MIN_DISTANCE - 1e-9
		);
	});

	it('menyambung kelompok lewat tetangga (rantai)', () => {
		const result = spreadMarkers([
			{ id: 'a', x: 0, y: 0 },
			{ id: 'b', x: 20, y: 0 },
			{ id: 'c', x: 40, y: 0 }
		]);

		expect(result.every((marker) => marker.isDisplaced)).toBe(true);
	});
});
