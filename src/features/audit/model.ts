/** Jalur masuknya data manual, sesuai enum `jenis` pada audit backend. */
export type UploadAuditKind =
	| 'telemetry_json'
	| 'telemetry_excel'
	| 'monthly_excel'
	| 'monthly_image'
	| 'monthly_form'
	| 'elevation_curve';

/** `publish` dan `ubah_status` dicatat untuk kurva EVA (terlihat di staging 12 Okt 2026). */
export type UploadAuditAction = 'upload' | 'hapus' | 'publish' | 'ubah_status';

export interface UploadAuditEntry {
	id: string;
	createdAt: string;
	kind: UploadAuditKind | string;
	action: UploadAuditAction | string;
	userId: string | null;
	/** `null` bila akunnya sudah dihapus — jejak peristiwanya tetap disimpan. */
	username: string | null;
	/**
	 * `null` berarti **lintas-PLTA**, bukan tidak diketahui: Excel bulanan
	 * seluruh PLTA dan gambar prakiraan hujan bersama memang menyentuh semuanya.
	 */
	pltaId: string | null;
	pltaCode: string | null;
	parameter: string | null;
	station: string | null;
	fileName: string | null;
	count: number;
	/** Rentang waktu DATA-nya, berbeda dari `createdAt` (waktu peristiwanya). */
	periodStart: string | null;
	periodEnd: string | null;
	details: Record<string, unknown> | null;
}

export interface UploadAuditPage {
	items: UploadAuditEntry[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface UploadAuditListParams {
	page: number;
	limit: number;
	kind?: UploadAuditKind | '';
	action?: UploadAuditAction | '';
	pltaId?: string;
	search?: string;
}
