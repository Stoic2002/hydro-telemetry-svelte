import { apiRequest, createApiResponseParser } from '../../../api/http';
import type { UploadAuditEntry, UploadAuditPage } from '../model';
import type { AuditRepository } from './audit-repository';
import { apiUploadAuditPageSchema, type ApiUploadAudit } from './schemas';

const parseResponse = createApiResponseParser('Respons server tidak sesuai kontrak riwayat unggah');

function mapEntry(item: ApiUploadAudit): UploadAuditEntry {
	return {
		id: item.id,
		createdAt: item.created_at,
		kind: item.jenis,
		action: item.aksi,
		userId: item.user_id,
		username: item.username,
		pltaId: item.plta_id,
		pltaCode: item.plta_code,
		parameter: item.parameter,
		station: item.station,
		fileName: item.nama_berkas,
		count: item.jumlah,
		periodStart: item.periode_start,
		periodEnd: item.periode_end,
		details: item.rincian
	};
}

export const httpAuditRepository: AuditRepository = {
	async listUploads(params, options): Promise<UploadAuditPage> {
		const endpoint = '/api/v1/audit/uploads';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: {
				page: params.page,
				limit: params.limit,
				// Nilai kosong tidak dikirim: backend memperlakukan parameter yang ada
				// sebagai saringan aktif, jadi string kosong akan menyaring habis.
				jenis: params.kind || undefined,
				aksi: params.action || undefined,
				plta_id: params.pltaId || undefined,
				search: params.search?.trim() || undefined
			}
		});
		const page = parseResponse(payload, apiUploadAuditPageSchema, endpoint);

		return {
			items: page.items.map(mapEntry),
			total: page.total,
			page: page.page,
			limit: page.limit,
			pages: page.pages
		};
	}
};
