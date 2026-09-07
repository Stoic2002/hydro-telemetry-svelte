import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
import type { UploadAuditListParams } from '../model';
import { auditRepository } from './repository';

export const auditQueryKeys = {
	all: ['audit'] as const,
	uploads: () => [...auditQueryKeys.all, 'uploads'] as const,
	uploadList: (params: UploadAuditListParams) => [...auditQueryKeys.uploads(), params] as const
};

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
