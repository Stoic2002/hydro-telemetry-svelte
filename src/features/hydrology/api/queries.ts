import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type {
	MonthlyHydrologyImageKind,
	UpsertMonthlyHydrologyInput,
	UploadMonthlyHydrologyImageInput
} from '../model';
import { hydrologyRepository } from './repository';

const HYDROLOGY_STALE_TIME = 60_000;

export const hydrologyQueryKeys = {
	all: ['hydrology'] as const,
	dashboardRoot: (pltaId: string) => [...hydrologyQueryKeys.all, 'dashboard', pltaId] as const,
	daily: (pltaId: string, date?: string) =>
		[...hydrologyQueryKeys.dashboardRoot(pltaId), 'daily', date ?? 'today'] as const,
	monthlyPanel: (pltaId: string, year: number, month: number) =>
		[...hydrologyQueryKeys.dashboardRoot(pltaId), 'monthly', year, month] as const,
	monthly: (pltaId: string, year: number) =>
		[...hydrologyQueryKeys.all, 'monthly', pltaId, year] as const,
	// Tidak bersarang di bawah pltaId: satu gambar dipakai seluruh PLTA, jadi
	// berpindah PLTA tidak boleh memicu pengambilan ulang gambar yang sama.
	monthlyImage: (year: number, month: number, kind: MonthlyHydrologyImageKind) =>
		[...hydrologyQueryKeys.all, 'monthly-image', year, month, kind] as const
};

export function createDailyHydrologyQuery(pltaId: () => string, date: () => string | undefined) {
	return createQuery(() => {
		const id = pltaId();
		const day = date();

		return {
			queryKey: hydrologyQueryKeys.daily(id, day),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getDaily(id, day, { signal }),
			enabled: Boolean(id),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createMonthlyHydrologyPanelQuery(
	pltaId: () => string,
	year: () => number,
	month: () => number
) {
	return createQuery(() => {
		const id = pltaId();
		const y = year();
		const m = month();

		return {
			queryKey: hydrologyQueryKeys.monthlyPanel(id, y, m),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getMonthlyPanel(id, y, m, { signal }),
			enabled: Boolean(id),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createMonthlyHydrologyQuery(pltaId: () => string, year: () => number) {
	return createQuery(() => {
		const id = pltaId();
		const y = year();

		return {
			queryKey: hydrologyQueryKeys.monthly(id, y),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.listMonthly(id, y, { signal }),
			enabled: Boolean(id),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createMonthlyHydrologyImageQuery(
	year: () => number,
	month: () => number,
	kind: () => MonthlyHydrologyImageKind,
	enabled: () => boolean
) {
	return createQuery(() => {
		const y = year();
		const m = month();
		const k = kind();

		return {
			queryKey: hydrologyQueryKeys.monthlyImage(y, m, k),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getMonthlyImage(y, m, k, { signal }),
			enabled: enabled(),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

/**
 * Satu berkas menyentuh seluruh PLTA, jadi tidak ada kunci yang cukup sempit
 * untuk diinvalidasi — semua cache hidrologi dianggap basi setelah impor.
 */
export function createUploadMonthlyHydrologyExcelMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (file: File) => hydrologyRepository.uploadMonthlyExcel(file),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.all });
		}
	}));
}

export function createDownloadMonthlyTemplateMutation() {
	return createMutation(() => ({
		mutationFn: ({ year, month }: { year: number; month: number }) =>
			hydrologyRepository.downloadMonthlyTemplate(year, month)
	}));
}

export function createUpsertMonthlyHydrologyMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: UpsertMonthlyHydrologyInput) => hydrologyRepository.upsertMonthly(input),
		onSuccess: async (record) => {
			await queryClient.invalidateQueries({
				queryKey: hydrologyQueryKeys.monthly(record.pltaId, record.year)
			});
			await queryClient.invalidateQueries({
				queryKey: hydrologyQueryKeys.dashboardRoot(record.pltaId)
			});
		}
	}));
}

/**
 * Unggahan gambar menyentuh seluruh PLTA sekaligus — path gambar ikut muncul di
 * respons panel bulanan setiap PLTA — jadi tidak ada kunci yang cukup sempit
 * untuk diinvalidasi sebagian.
 */
export function createUploadMonthlyHydrologyImageMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: UploadMonthlyHydrologyImageInput) =>
			hydrologyRepository.uploadMonthlyImage(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.all });
		}
	}));
}
