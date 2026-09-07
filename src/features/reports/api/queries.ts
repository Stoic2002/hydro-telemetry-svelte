import {
	createMutation,
	createQuery,
	keepPreviousData,
	useQueryClient
} from '@tanstack/svelte-query';
import type { CreateReportInput, ReportListParams } from '../model';
import { reportsRepository } from './repository';

export const reportQueryKeys = {
	all: ['reports'] as const,
	lists: () => [...reportQueryKeys.all, 'list'] as const,
	list: (params: ReportListParams) => [...reportQueryKeys.lists(), params] as const,
	detail: (reportId: string) => [...reportQueryKeys.all, 'detail', reportId] as const
};

export function createReportsQuery(params: () => ReportListParams) {
	return createQuery(() => {
		const value = params();

		return {
			queryKey: reportQueryKeys.list(value),
			queryFn: ({ signal }: { signal: AbortSignal }) => reportsRepository.list(value, { signal }),
			placeholderData: keepPreviousData,
			// Laporan diproses di latar; polling berhenti sendiri begitu tidak ada
			// lagi baris berstatus pending atau processing.
			refetchInterval: (query) =>
				query.state.data?.items.some(
					(report) => report.status === 'pending' || report.status === 'processing'
				)
					? 3_000
					: false,
			refetchOnWindowFocus: false
		};
	});
}

export function createCreateReportMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: CreateReportInput) => reportsRepository.create(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: reportQueryKeys.lists() });
		}
	}));
}

export function createDownloadReportMutation() {
	return createMutation(() => ({
		mutationFn: (reportId: string) => reportsRepository.download(reportId)
	}));
}
