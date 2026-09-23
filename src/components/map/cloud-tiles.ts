/**
 * Konversi koordinat geografis ke petak (tile) skema Web Mercator, dipakai untuk
 * menempatkan citra awan Himawari-9 di atas peta.
 *
 * Semua fungsi di sini murni sehingga dapat diuji tanpa merender peta.
 */

/**
 * Inframerah bersih kanal 13 (10,4 µm): suhu puncak awan, siang maupun malam,
 * diperbarui tiap 10 menit. GIBS hanya menyediakannya sampai zoom 6, dan pada
 * zoom itu Jawa Tengah muat dalam dua petak.
 */
export const HIMAWARI_LAYER = 'Himawari_AHI_Band13_Clean_Infrared';
export const HIMAWARI_TILE_MATRIX_SET = 'GoogleMapsCompatible_Level6';
export const CLOUD_TILE_ZOOM = 6;

/**
 * Waktu `default` di GIBS berarti bingkai terbaru yang seluruh petaknya sudah
 * selesai diproses. Bingkai paling akhir di daftar waktu GIBS kadang baru
 * sebagian petaknya tersedia (sisanya 404), jadi waktu tidak dihitung sendiri.
 */
export const HIMAWARI_LATEST_TIME = 'default';

export const CENTRAL_JAVA_BOUNDS = {
	west: 108,
	east: 112.2,
	north: -5.4,
	south: -8.6
} as const;

export interface MapTile {
	x: number;
	y: number;
	zoom: number;
}

export interface GeoBounds {
	west: number;
	east: number;
	north: number;
	south: number;
}

/** Posisi pecahan di grid petak; bagian bulatnya nomor petak. */
export function longitudeToTileCoordinate(longitude: number, zoom: number): number {
	return ((longitude + 180) / 360) * 2 ** zoom;
}

export function latitudeToTileCoordinate(latitude: number, zoom: number): number {
	const latitudeRadians = (latitude * Math.PI) / 180;
	return ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * 2 ** zoom;
}

export function longitudeToTileX(longitude: number, zoom: number): number {
	return Math.floor(longitudeToTileCoordinate(longitude, zoom));
}

export function latitudeToTileY(latitude: number, zoom: number): number {
	return Math.floor(latitudeToTileCoordinate(latitude, zoom));
}

export function tileXToLongitude(x: number, zoom: number): number {
	return (x / 2 ** zoom) * 360 - 180;
}

export function tileYToLatitude(y: number, zoom: number): number {
	const mercatorY = Math.PI * (1 - (2 * y) / 2 ** zoom);
	return (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;
}

/** Seluruh petak yang menutupi kotak batas, berurutan baris demi baris. */
export function createCloudTiles(bounds: GeoBounds = CENTRAL_JAVA_BOUNDS): MapTile[] {
	const firstX = longitudeToTileX(bounds.west, CLOUD_TILE_ZOOM);
	const lastX = longitudeToTileX(bounds.east, CLOUD_TILE_ZOOM);
	const firstY = latitudeToTileY(bounds.north, CLOUD_TILE_ZOOM);
	const lastY = latitudeToTileY(bounds.south, CLOUD_TILE_ZOOM);
	const tiles: MapTile[] = [];

	for (let y = firstY; y <= lastY; y += 1) {
		for (let x = firstX; x <= lastX; x += 1) {
			tiles.push({ x, y, zoom: CLOUD_TILE_ZOOM });
		}
	}

	return tiles;
}

export const CENTRAL_JAVA_CLOUD_TILES = createCloudTiles();

/**
 * Susunan petak sebagai satu kanvas: ukuran grid, posisi tiap petak, dan batas
 * geografis kanvas gabungannya.
 */
export function describeTileGrid(tiles: readonly MapTile[]) {
	const xs = tiles.map((tile) => tile.x);
	const ys = tiles.map((tile) => tile.y);
	const firstX = Math.min(...xs);
	const firstY = Math.min(...ys);
	const lastX = Math.max(...xs);
	const lastY = Math.max(...ys);
	const zoom = tiles[0]?.zoom ?? CLOUD_TILE_ZOOM;

	return {
		columns: lastX - firstX + 1,
		rows: lastY - firstY + 1,
		column: (tile: MapTile) => tile.x - firstX,
		row: (tile: MapTile) => tile.y - firstY,
		bounds: {
			west: tileXToLongitude(firstX, zoom),
			east: tileXToLongitude(lastX + 1, zoom),
			north: tileYToLatitude(firstY, zoom),
			south: tileYToLatitude(lastY + 1, zoom)
		} satisfies GeoBounds,
		/**
		 * Rentang piksel kanvas yang jatuh di dalam `area`, untuk menghitung awan
		 * hujan hanya di atas Jawa Tengah dan bukan di seluruh petak.
		 */
		pixelWindow(area: GeoBounds, tileSize: number) {
			const toPixel = (tileCoordinate: number, first: number) =>
				Math.round((tileCoordinate - first) * tileSize);

			return {
				left: toPixel(longitudeToTileCoordinate(area.west, zoom), firstX),
				right: toPixel(longitudeToTileCoordinate(area.east, zoom), firstX),
				top: toPixel(latitudeToTileCoordinate(area.north, zoom), firstY),
				bottom: toPixel(latitudeToTileCoordinate(area.south, zoom), firstY)
			};
		}
	};
}

export function himawariTileUrl(baseUrl: string, time: string, tile: MapTile): string {
	const base = baseUrl.replace(/\/+$/, '');
	return `${base}/${HIMAWARI_LAYER}/default/${time}/${HIMAWARI_TILE_MATRIX_SET}/${tile.zoom}/${tile.y}/${tile.x}.png`;
}
