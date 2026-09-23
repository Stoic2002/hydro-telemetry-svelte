import { describe, expect, it } from 'vitest';
import {
	CENTRAL_JAVA_BOUNDS,
	CLOUD_TILE_ZOOM,
	createCloudTiles,
	describeTileGrid,
	himawariTileUrl,
	latitudeToTileY,
	longitudeToTileX,
	tileXToLongitude,
	tileYToLatitude
} from './cloud-tiles';

describe('konversi petak', () => {
	it('memetakan meridian dan khatulistiwa ke tengah grid', () => {
		expect(longitudeToTileX(0, 1)).toBe(1);
		expect(latitudeToTileY(0, 1)).toBe(1);
	});

	it('membalik konversi kembali ke sudut barat laut petak', () => {
		const zoom = CLOUD_TILE_ZOOM;
		const x = longitudeToTileX(110.1, zoom);
		const y = latitudeToTileY(-7.42, zoom);

		// Sudut barat laut selalu berada di barat dan utara titik asalnya.
		expect(tileXToLongitude(x, zoom)).toBeLessThanOrEqual(110.1);
		expect(tileXToLongitude(x + 1, zoom)).toBeGreaterThan(110.1);
		expect(tileYToLatitude(y, zoom)).toBeGreaterThanOrEqual(-7.42);
		expect(tileYToLatitude(y + 1, zoom)).toBeLessThan(-7.42);
	});
});

describe('createCloudTiles', () => {
	const tiles = createCloudTiles();

	it('menghasilkan grid yang menutupi seluruh kotak batas Jawa Tengah', () => {
		expect(tiles.length).toBeGreaterThan(0);
		expect(tiles.every((tile) => tile.zoom === CLOUD_TILE_ZOOM)).toBe(true);

		const westEdge = Math.min(...tiles.map((tile) => tileXToLongitude(tile.x, tile.zoom)));
		const eastEdge = Math.max(...tiles.map((tile) => tileXToLongitude(tile.x + 1, tile.zoom)));
		const northEdge = Math.max(...tiles.map((tile) => tileYToLatitude(tile.y, tile.zoom)));
		const southEdge = Math.min(...tiles.map((tile) => tileYToLatitude(tile.y + 1, tile.zoom)));

		expect(westEdge).toBeLessThanOrEqual(CENTRAL_JAVA_BOUNDS.west);
		expect(eastEdge).toBeGreaterThanOrEqual(CENTRAL_JAVA_BOUNDS.east);
		expect(northEdge).toBeGreaterThanOrEqual(CENTRAL_JAVA_BOUNDS.north);
		expect(southEdge).toBeLessThanOrEqual(CENTRAL_JAVA_BOUNDS.south);
	});

	it('tidak menghasilkan petak kembar', () => {
		const keys = new Set(tiles.map((tile) => `${tile.zoom}-${tile.x}-${tile.y}`));

		expect(keys.size).toBe(tiles.length);
	});
});

describe('describeTileGrid', () => {
	const tiles = createCloudTiles();
	const grid = describeTileGrid(tiles);

	it('menempatkan setiap petak tepat sekali di dalam grid', () => {
		const cells = new Set(tiles.map((tile) => `${grid.column(tile)}-${grid.row(tile)}`));

		expect(cells.size).toBe(grid.columns * grid.rows);
	});

	it('memotong jendela piksel Jawa Tengah di dalam kanvas', () => {
		const window = grid.pixelWindow(CENTRAL_JAVA_BOUNDS, 256);

		expect(window.left).toBeGreaterThanOrEqual(0);
		expect(window.top).toBeGreaterThanOrEqual(0);
		expect(window.right).toBeLessThanOrEqual(grid.columns * 256);
		expect(window.bottom).toBeLessThanOrEqual(grid.rows * 256);
		expect(window.right).toBeGreaterThan(window.left);
		expect(window.bottom).toBeGreaterThan(window.top);
	});
});

describe('himawariTileUrl', () => {
	it('menyusun URL WMTS REST GIBS dengan urutan baris sebelum kolom', () => {
		expect(
			himawariTileUrl('https://gibs.example/wmts/', '2026-09-23T06:40:00Z', {
				x: 51,
				y: 33,
				zoom: 6
			})
		).toBe(
			'https://gibs.example/wmts/Himawari_AHI_Band13_Clean_Infrared/default/2026-09-23T06:40:00Z/GoogleMapsCompatible_Level6/6/33/51.png'
		);
	});
});
