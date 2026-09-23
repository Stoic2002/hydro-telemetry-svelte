import { createQuery } from '@tanstack/svelte-query';
import type { FeatureCollection, GeoJsonProperties, Geometry, LineString } from 'geojson';
import { env } from '$shared/lib/env';
import { maskCloudPixels } from './cloud-mask';
import {
	CENTRAL_JAVA_BOUNDS,
	CENTRAL_JAVA_CLOUD_TILES,
	HIMAWARI_LATEST_TIME,
	describeTileGrid,
	himawariTileUrl,
	type GeoBounds
} from './cloud-tiles';

/**
 * Pemuatan aset peta dan citra awan lewat TanStack Query.
 *
 * Sebelumnya keduanya memakai `useEffect` + `fetch` manual dengan state loading,
 * error, dan interval refresh yang ditulis sendiri, sehingga perilaku cache dan
 * retry-nya berbeda dari seluruh bagian aplikasi lain.
 */

/**
 * Berkas peta memakai ekstensi `.json`, bukan `.geojson`.
 *
 * Server statis memetakan `.geojson` ke `application/geo+json`, dan tipe itu
 * tidak lolos filter kompresi milik server preview maupun default `gzip_types`
 * nginx. Isinya JSON biasa, jadi ekstensi `.json` membuat keduanya terkompresi
 * dan menghemat ratusan kilobyte pada halaman Overview.
 */
const MAP_LAYER_URLS = {
	regencies: '/central-java-regencies.json',
	rivers: '/central-java-rivers.json'
} as const;

/** Batas wilayah adalah aset statis; muat sekali per sesi. */
const MAP_LAYER_STALE_TIME = Infinity;
/** Himawari memotret setiap 10 menit. */
const CLOUD_REFRESH_MS = 10 * 60 * 1_000;

export interface RiverProperties {
	hyrivId: number;
	nextDown: number;
	mainRiver: number;
	lengthKm: number;
	catchmentKm2: number;
	upstreamKm2: number;
	averageDischargeM3s: number;
	strahlerOrder: number;
	flowOrder: number;
}

export interface MapLayers {
	regencies: FeatureCollection<Geometry, GeoJsonProperties>;
	rivers: FeatureCollection<LineString, RiverProperties>;
}

export const mapQueryKeys = {
	all: ['map'] as const,
	layers: () => [...mapQueryKeys.all, 'layers'] as const,
	cloudImagery: () => [...mapQueryKeys.all, 'cloud-imagery'] as const
};

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error('Gagal memuat data peta');

	return response.json() as Promise<T>;
}

async function fetchMapLayers(signal: AbortSignal): Promise<MapLayers> {
	const [regencies, rivers] = await Promise.all([
		fetchJson<MapLayers['regencies']>(MAP_LAYER_URLS.regencies, signal),
		fetchJson<MapLayers['rivers']>(MAP_LAYER_URLS.rivers, signal)
	]);

	return { regencies, rivers };
}

export function createMapLayersQuery() {
	return createQuery(() => ({
		queryKey: mapQueryKeys.layers(),
		queryFn: ({ signal }: { signal: AbortSignal }) => fetchMapLayers(signal),
		staleTime: MAP_LAYER_STALE_TIME,
		refetchOnWindowFocus: false
	}));
}

/**
 * Bagian piksel yang harus dikenali colormap sebelum hasilnya dipercaya. Ubin
 * cerah mencapai ~99,9% dan ubin penuh badai ~96,7%; sisanya warna campuran
 * di tepi awan. Di bawah ambang ini colormap GIBS kemungkinan sudah berganti,
 * dan overlay yang kosong akan terbaca "tidak ada awan hujan" padahal salah.
 */
const MIN_RECOGNIZED_RATIO = 0.9;

export interface CloudImagery {
	/** Waktu pemotretan, epoch milidetik. */
	time: number;
	/** PNG transparan berisi awan hujan saja. */
	imageUrl: string;
	/** Batas geografis gambar, untuk menempatkannya di proyeksi peta. */
	bounds: GeoBounds;
	/** Ada awan hujan di atas kotak batas Jawa Tengah. */
	hasRainClouds: boolean;
}

async function fetchTile(url: string, signal: AbortSignal): Promise<Response> {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error('Citra awan tidak tersedia');
	return response;
}

async function fetchCloudImagery(baseUrl: string, signal: AbortSignal): Promise<CloudImagery> {
	const [firstTile, ...otherTiles] = CENTRAL_JAVA_CLOUD_TILES;

	// Petak pertama diminta dengan waktu `default`, lalu waktu sebenarnya dibaca
	// dari header dan dipakai untuk petak lain supaya semuanya satu bingkai.
	const firstResponse = await fetchTile(
		himawariTileUrl(baseUrl, HIMAWARI_LATEST_TIME, firstTile),
		signal
	);
	const time = firstResponse.headers.get('layer-time-actual') ?? '';
	const timestamp = Date.parse(time);
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(time) || Number.isNaN(timestamp)) {
		throw new Error('Waktu citra awan tidak valid');
	}

	const responses = [
		firstResponse,
		...(await Promise.all(
			otherTiles.map((tile) => fetchTile(himawariTileUrl(baseUrl, time, tile), signal))
		))
	];
	const bitmaps = await Promise.all(
		responses.map(async (response) => createImageBitmap(await response.blob()))
	);

	const tileSize = bitmaps[0].width;
	const grid = describeTileGrid(CENTRAL_JAVA_CLOUD_TILES);
	const canvas = document.createElement('canvas');
	canvas.width = grid.columns * tileSize;
	canvas.height = grid.rows * tileSize;

	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Kanvas tidak tersedia');

	CENTRAL_JAVA_CLOUD_TILES.forEach((tile, index) => {
		context.drawImage(bitmaps[index], grid.column(tile) * tileSize, grid.row(tile) * tileSize);
		bitmaps[index].close();
	});

	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	const { recognizedRatio, rainPixels } = maskCloudPixels(
		image.data,
		canvas.width,
		canvas.height,
		grid.pixelWindow(CENTRAL_JAVA_BOUNDS, tileSize)
	);
	if (recognizedRatio < MIN_RECOGNIZED_RATIO) {
		throw new Error('Format citra awan tidak dikenali');
	}
	context.putImageData(image, 0, 0);

	return {
		time: timestamp,
		imageUrl: canvas.toDataURL('image/png'),
		bounds: grid.bounds,
		hasRainClouds: rainPixels > 0
	};
}

/**
 * Citra awan Himawari terbaru. Query dimatikan bila overlay tidak diminta atau
 * bila sumbernya sengaja dikosongkan untuk jaringan tanpa akses internet.
 */
export function createCloudImageryQuery(enabled: () => boolean) {
	const baseUrl = env.cloudImageryUrl;

	return createQuery(() => ({
		queryKey: mapQueryKeys.cloudImagery(),
		queryFn: ({ signal }: { signal: AbortSignal }) => fetchCloudImagery(baseUrl ?? '', signal),
		enabled: enabled() && Boolean(baseUrl),
		staleTime: CLOUD_REFRESH_MS,
		refetchInterval: CLOUD_REFRESH_MS,
		refetchOnWindowFocus: false
	}));
}
