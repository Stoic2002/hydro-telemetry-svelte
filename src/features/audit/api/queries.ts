import { createQuery, keepPreviousData, type QueryClient } from '@tanstack/svelte-query';
import type { UploadAuditListParams } from '../model';
import { auditRepository } from './repository';

export const auditQueryKeys = {
	all: ['audit'] as const,
	uploads: () => [...auditQueryKeys.all, 'uploads'] as const,
	uploadList: (params: UploadAuditListParams) => [...auditQueryKeys.uploads(), params] as const
};

/**
 * Setiap unggahan dan penghapusan data manual menambah baris jejak audit, dan
 * panel riwayatnya menempel tepat di bawah formulir yang menghasilkannya. Tanpa
 * ini operator melihat unggahannya berhasil sementara tabel di bawahnya masih
 * memperlihatkan keadaan sebelum unggahan.
 */
export function invalidateUploadAudit(queryClient: QueryClient): Promise<void> {
	return queryClient.invalidateQueries({ queryKey: auditQueryKeys.uploads() });
}

export function createUploadAuditQuery(params: () => UploadAuditListParams) {
	return createQuery(() => {
		const value = params();

		return {
			queryKey: auditQueryKeys.uploadList(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				auditRepository.listUploads(value, { signal }),
			placeholderData: keepPreviousData,
			refetchOnWindowFocus: false
		};
	});
}
