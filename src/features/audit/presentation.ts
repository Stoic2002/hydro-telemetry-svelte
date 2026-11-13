import type { UploadAuditAction, UploadAuditEntry, UploadAuditKind } from './model';

/**
 * Label non-teknis untuk operator. Nama enum backend seperti `telemetry_json`
 * tidak boleh tampil di layar operasional.
 */
const KIND_LABEL: Record<UploadAuditKind, string> = {
	telemetry_json: 'Input manual',
	telemetry_excel: 'Excel telemetri',
	monthly_excel: 'Excel bulanan',
	monthly_image: 'Gambar hujan',
	monthly_form: 'Form bulanan',
	elevation_curve: 'Kurva elevasi'
};

const ACTION_LABEL: Record<UploadAuditAction, string> = {
	upload: 'Unggah',
	hapus: 'Hapus',
	publish: 'Publish',
	ubah_status: 'Ubah status'
};

export const UPLOAD_AUDIT_KIND_OPTIONS = [
	{ value: '', label: 'Semua jalur' },
	...(Object.keys(KIND_LABEL) as UploadAuditKind[]).map((kind) => ({
		value: kind,
		label: KIND_LABEL[kind]
	}))
];

export function uploadAuditKindLabel(kind: string): string {
	return KIND_LABEL[kind as UploadAuditKind] ?? kind;
}

/**
 * Aksi yang belum dikenal tetap dirapikan (`ubah_status` → "Ubah status")
 * supaya nama enum backend yang baru tidak tampil mentah sebelum dipetakan.
 */
export function uploadAuditActionLabel(action: string): string {
	const known = ACTION_LABEL[action as UploadAuditAction];
	if (known) return known;

	const words = action.replaceAll('_', ' ').trim();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : action;
}

/**
 * Nama keempat gambar BMKG — sama dengan `MONTHLY_IMAGE_KIND_LABEL` di fitur
 * hidrologi; disalin di sini supaya fitur audit tidak bergantung pada fitur
 * lain demi satu tabel nama.
 */
const IMAGE_KIND_LABEL: Record<string, string> = {
	prediksi_curah_hujan: 'Prediksi Curah Hujan',
	prediksi_sifat_hujan: 'Prediksi Sifat Hujan',
	realisasi_curah_hujan: 'Realisasi Curah Hujan',
	realisasi_sifat_hujan: 'Realisasi Sifat Hujan'
};

/**
 * Isi kolom "Berkas / parameter". Riwayat gambar hujan dulu hanya menulis nama
 * berkas, jadi tidak ketahuan gambar mana yang diunggah atau dihapus (temuan QA
 * T18). Jenisnya dicari di `parameter` lalu di `rincian`; bila tidak ada,
 * tampilannya tetap seperti sebelumnya.
 */
export function uploadAuditSubject(entry: UploadAuditEntry): string {
	const base = entry.fileName ?? entry.parameter ?? '—';
	if (entry.kind !== 'monthly_image') return base;

	const candidates = [
		entry.parameter,
		entry.details?.jenis,
		entry.details?.jenis_gambar,
		entry.details?.kind
	];
	const imageKind = candidates.find(
		(value): value is string => typeof value === 'string' && value in IMAGE_KIND_LABEL
	);
	if (!imageKind) return base;

	const label = IMAGE_KIND_LABEL[imageKind];
	return entry.fileName ? `${label} · ${entry.fileName}` : label;
}
