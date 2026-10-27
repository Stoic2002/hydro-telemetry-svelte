export interface PaginatedResult<TItem> {
	items: TItem[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface ListParams {
	page: number;
	limit: number;
	search?: string;
}

export interface RiverBasin {
	id: string;
	code: string;
	name: string;
	description: string | null;
}

export interface Plant {
	id: string;
	code: string;
	name: string;
	riverBasinId: string;
	latitude: number | null;
	longitude: number | null;
	capacityMw: number | null;
	description: string | null;
	isActive: boolean;
	bebanToOutflowNum: number;
	bebanToOutflowDen: number;
	constants: Record<string, unknown>;
}

/** Isian Wilayah Sungai baru (`POST /wilayah-sungai`). `code` unik, maks. 32 karakter. */
export interface RiverBasinInput {
	code: string;
	name: string;
	description: string | null;
}

/** Kode Wilayah Sungai tidak bisa diubah setelah dibuat. */
export type RiverBasinChanges = Partial<Pick<RiverBasinInput, 'name' | 'description'>>;

/**
 * Isian PLTA (`POST /plta`). `constants` sengaja tidak ada: server menimpanya
 * UTUH, jadi form identitas tidak pernah mengirimnya — konstanta diatur
 * terpisah setelah daftar kuncinya dipastikan.
 */
export interface PlantInput {
	code: string;
	name: string;
	riverBasinId: string;
	latitude: number | null;
	longitude: number | null;
	capacityMw: number | null;
	description: string | null;
	isActive: boolean;
	bebanToOutflowNum: number;
	bebanToOutflowDen: number;
}

/** Hanya bidang yang berubah; kode PLTA tidak bisa diubah setelah dibuat. */
export type PlantChanges = Partial<Omit<PlantInput, 'code'>>;

export type PlantTagProtocol = 'opcua' | 'modbus' | 'sql' | 'rest' | 'upload' | 'derived';

export interface PlantTag {
	id: string;
	pltaId: string;
	parameter: string;
	station: string;
	protocol: PlantTagProtocol;
	address: string;
	httpHeaders: Record<string, string>;
	valuePath: string | null;
	timestampPath: string | null;
	scale: number;
	offset: number;
	unit: string;
	enabled: boolean;
	/** Nama tampilan tag; `null` bila belum diberi. */
	label: string | null;
	/** Batas bawah kelayakan pembacaan; `null` = tanpa batas di sisi itu. */
	minValid: number | null;
	maxValid: number | null;
}

/**
 * Rentang pembacaan yang dianggap sah. Server menerimanya sebagai satu
 * kesatuan: mengirim satu sisi saja tetap menimpa sisi lain menjadi `null`.
 */
export interface TagBounds {
	minValid: number | null;
	maxValid: number | null;
}

/** Protokol yang boleh didaftarkan pengguna; `derived` (formulasi) dikelola sistem. */
export type TagInputProtocol = Exclude<PlantTagProtocol, 'derived'>;

/** Panel Hidrologi Harian tempat parameter ini tampil; `null` = tidak di panel. */
export type TagPanel = 'hulu' | 'dam' | 'hilir';

/**
 * Isian tag baru (`POST /tags`, khusus admin): sumber data untuk satu
 * kombinasi (PLTA, parameter, station). Bidang REST hanya berlaku untuk
 * protokol `rest` — server menolaknya di protokol lain.
 */
export interface TagInput {
	pltaId: string;
	parameter: string;
	station: string;
	label: string | null;
	protocol: TagInputProtocol;
	address: string;
	httpHeaders: Record<string, string> | null;
	valuePath: string | null;
	timestampPath: string | null;
	scale: number;
	offset: number;
	unit: string | null;
	minValid: number | null;
	maxValid: number | null;
	enabled: boolean;
	panel: TagPanel | null;
}

export interface PlantTagListParams extends ListParams {
	protocol?: PlantTagProtocol;
	enabled?: boolean;
}
