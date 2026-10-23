import type { UploadAuditAction, UploadAuditKind } from './model';

/**
 * Label non-teknis untuk operator. Nama enum backend seperti `telemetry_json`
 * tidak boleh tampil di layar operasional.
 */
const KIND_LABEL: Record<UploadAuditKind, string> = {
	telemetry_json: 'Input manual',
	telemetry_excel: 'Excel telemetri',
	monthly_excel: 'Excel bulanan',
	monthly_image: 'Prakiraan hujan',
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
