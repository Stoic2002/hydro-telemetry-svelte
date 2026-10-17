export type TrendAggregation = 'avg' | 'sum';
export type TrendResolution = 'raw' | '5m' | '1h' | '1d';

export interface TrendQueryInput {
	pltaId: string;
	parameter: string;
	from: string;
	to: string;
	resolution: TrendResolution;
	station?: string;
	aggregation?: TrendAggregation;
}

export interface TrendPoint {
	time: string;
	value: number;
	quality: string;
	pureQuality: boolean;
}

const RESOLUTION_BUCKET_MS: Record<TrendResolution, number> = {
	raw: 60 * 1_000,
	'5m': 5 * 60 * 1_000,
	'1h': 60 * 60 * 1_000,
	'1d': 24 * 60 * 60 * 1_000
};

/**
 * Membulatkan rentang waktu ke batas resolusinya.
 *
 * Rentang dihitung dari `Date.now()`, jadi tanpa pembulatan setiap render
 * menghasilkan nilai `to` yang berbeda pada presisi milidetik. Nilai itu ikut
 * masuk query key, sehingga cache tidak pernah kena dan setiap kunjungan ke
 * halaman tren memicu request baru.
 */
export function alignTrendRange(
	now: Date,
	durationMs: number,
	resolution: TrendResolution
): { from: string; to: string } {
	const bucketMs = RESOLUTION_BUCKET_MS[resolution];
	const alignedTo = Math.ceil(now.getTime() / bucketMs) * bucketMs;

	return {
		from: new Date(alignedTo - durationMs).toISOString(),
		to: new Date(alignedTo).toISOString()
	};
}

export interface TrendSeries {
	pltaId: string;
	parameter: string;
	station: string | null;
	resolution: string;
	points: TrendPoint[];
	/** Station yang ikut dihitung saat `station` null; kosong untuk seri tunggal. */
	aggregatedStations: string[];
	/** Pembacaan yang nilainya di luar batas wajar dan tidak ikut ditampilkan. */
	discardedPoints: number;
}

/**
 * Daftar tren per PLTA (`/trends/plta/{id}/series`, 13 Okt 2026). Ditetapkan
 * admin per PLTA; tiap item satu metrik panel harian, dan item segrup
 * digambar dalam satu grafik.
 */
export type TrendPanel = 'hulu' | 'dam' | 'hilir';

export interface PlantTrendItem {
	id: string;
	/** Kunci metrik panel harian, mis. `tma_waduk`. */
	key: string;
	order: number;
	group: string | null;
	label: string;
	/** `true` = nama khusus tren sedang berlaku. */
	isLabelCustom: boolean;
	unit: string | null;
	panel: TrendPanel;
	/** `measured` · `derived` · `plan`; `plan` = satu nilai per tanggal, digambar sebagai garis tangga. */
	source: string;
}

export interface PlantTrendChart {
	title: string;
	group: string | null;
	/** Id item dalam grafik ini, urut tampil. */
	itemIds: string[];
}

export interface PlantTrendList {
	pltaId: string;
	/** `false` = PLTA ini belum punya daftar tren. */
	isConfigured: boolean;
	items: PlantTrendItem[];
	charts: PlantTrendChart[];
}

export interface PlantTrendSeries {
	/** Nama garis / kolom unduhan. */
	name: string;
	/** Station yang dibaca; `null` = gabungan `stations`. */
	station: string | null;
	stations: string[];
	points: TrendPoint[];
	/** Dipotong pada batas 5.000 titik — perkecil rentang. */
	isTruncated: boolean;
}

export interface PlantTrendDataItem extends PlantTrendItem {
	/** Resolusi yang sungguh dipakai: hujan minimal `1h`, estimasi minimal `5m`. */
	effectiveResolution: string;
	hasData: boolean;
	series: PlantTrendSeries[];
}

export interface PlantTrendData {
	pltaId: string;
	resolution: string;
	from: string;
	to: string;
	items: PlantTrendDataItem[];
	charts: PlantTrendChart[];
}

export interface PlantTrendDataInput {
	pltaId: string;
	from: string;
	to: string;
	resolution: TrendResolution;
	/** Hanya item ini (`?item=` berulang); kosong/tidak diisi = seluruh daftar. */
	itemIds?: readonly string[];
}

export interface TrendCandidate {
	key: string;
	label: string;
	unit: string | null;
	panel: TrendPanel;
	source: string;
	/** Cara riwayatnya dibangun, mis. `satu`, `jumlah`, `rata2`, `per_stasiun`. */
	kind: string;
	/** `true` = disajikan sebagai total per jam/hari. */
	isRainfall: boolean;
	/** Hari terakhir berdata; `null` = belum pernah. */
	lastDataDate: string | null;
	isUsed: boolean;
}

export interface TrendCatalog {
	pltaId: string;
	candidates: TrendCandidate[];
	/** Metrik panel yang belum bisa dijadikan tren, beserta alasannya. */
	unavailable: Record<string, string>;
}

/** Satu item daftar baru yang dikirim; urutan array = urutan tampil. */
export interface PlantTrendItemInput {
	key: string;
	group: string | null;
	/** Nama khusus tren; `null` = ikut nama panel. */
	label: string | null;
}

export type TrendExportFormat = 'xlsx' | 'csv';
