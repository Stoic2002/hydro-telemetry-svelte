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
	hapus: 'Hapus'
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

export function uploadAuditActionLabel(action: string): string {
	return ACTION_LABEL[action as UploadAuditAction] ?? action;
}
