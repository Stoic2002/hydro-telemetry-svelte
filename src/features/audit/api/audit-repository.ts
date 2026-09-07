import type { UploadAuditListParams, UploadAuditPage } from '../model';

export interface AuditRequestOptions {
	signal?: AbortSignal;
}

export interface AuditRepository {
	listUploads(
		params: UploadAuditListParams,
		options?: AuditRequestOptions
	): Promise<UploadAuditPage>;
}
