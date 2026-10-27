import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { invalidateUploadAudit } from '../../audit/api/queries';
import type {
	DailyEmptyCellMode,
	DailyLayoutChanges,
	LabelChanges,
	DailyHydrologyParams,
	DailyHydrologyReportScope,
	HydrologyPeriod,
	MonthlyReportScope,
	MonthlyHydrologyImageKind,
	UpsertMonthlyHydrologyInput,
	UploadMonthlyHydrologyImageInput
} from '../model';
import { hydrologyRepository } from './repository';

const HYDROLOGY_STALE_TIME = 60_000;

/** Bagian kunci untuk periode; yang kosong diberi nama, bukan dibiarkan `undefined`. */
function periodKey(period: HydrologyPeriod) {
	return [
		period.year,
		period.month ?? 'all-months',
		period.endYear ?? 'same-year',
		period.endMonth ?? 'same-month'
	] as const;
}

export const hydrologyQueryKeys = {
	all: ['hydrology'] as const,
	dashboardRoot: (pltaId: string) => [...hydrologyQueryKeys.all, 'dashboard', pltaId] as const,
	/**
	 * Penyebut DMN ikut jadi bagian kunci: mengganti unit terpilih mengubah
	 * beberapa metrik turunan, jadi hasilnya bukan data yang sama.
	 */
	daily: (pltaId: string, params: DailyHydrologyParams = {}) =>
		[
			...hydrologyQueryKeys.dashboardRoot(pltaId),
			'daily',
			params.date ?? 'today',
			params.units?.length ? params.units.join(',') : 'all-units',
			params.dmnMw ?? 'auto-dmn'
		] as const,
	// Di bawah `dashboardRoot`: mengubah visibilitas menginvalidasi akar itu,
	// sehingga panel harian ikut diambil ulang dan menyesuaikan diri.
	// Tidak di bawah `dashboardRoot`: nama bidang bulanan berlaku untuk seluruh PLTA.
	monthlyFieldLabels: () => [...hydrologyQueryKeys.all, 'monthly-labels'] as const,
	dailyVisibility: (pltaId: string) =>
		[...hydrologyQueryKeys.dashboardRoot(pltaId), 'daily-visibility'] as const,
	monthlyPanel: (pltaId: string, year: number, month: number) =>
		[...hydrologyQueryKeys.dashboardRoot(pltaId), 'monthly', year, month] as const,
	monthly: (pltaId: string, year: number) =>
		[...hydrologyQueryKeys.all, 'monthly', pltaId, year] as const,
	// Tidak bersarang di bawah pltaId: satu gambar dipakai seluruh PLTA, jadi
	// berpindah PLTA tidak boleh memicu pengambilan ulang gambar yang sama.
	monthlyImage: (year: number, month: number, kind: MonthlyHydrologyImageKind) =>
		[...hydrologyQueryKeys.all, 'monthly-image', year, month, kind] as const,
	// Di bawah `all`: impor Excel dan isian bulanan menginvalidasi `all`, jadi
	// ringkasan seluruh PLTA ikut segar tanpa wiring tambahan.
	monthlyOverview: (period: HydrologyPeriod) =>
		[...hydrologyQueryKeys.all, 'monthly-overview', ...periodKey(period)] as const,
	// Di bawah `dashboardRoot`: grafik ini milik satu PLTA, dan mengubah isian
	// bulanan PLTA itu sudah menginvalidasi akarnya.
	monthlyChart: (pltaId: string, period: HydrologyPeriod) =>
		[...hydrologyQueryKeys.dashboardRoot(pltaId), 'monthly-chart', ...periodKey(period)] as const
};

export function createDailyHydrologyQuery(
	pltaId: () => string,
	params: () => DailyHydrologyParams = () => ({})
) {
	return createQuery(() => {
		const id = pltaId();
		const value = params();

		return {
			queryKey: hydrologyQueryKeys.daily(id, value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getDaily(id, value, { signal }),
			// Mengganti penyebut DMN hanya mengubah dua metrik (Service Hour Full
			// Load dan DMN Beban Penuh). Panel lainnya dipertahankan selama
			// permintaan baru berjalan — dulu seluruh baris berubah jadi "Memuat…"
			// dan kartunya menciut. Hanya untuk PLTA yang sama: data PLTA lain
			// tidak boleh tampil sebagai milik PLTA yang baru dipilih.
			placeholderData: (previous, previousQuery) => {
				const root = hydrologyQueryKeys.dashboardRoot(id);
				const isSamePlant = root.every((part, index) => previousQuery?.queryKey[index] === part);
				return isSamePlant ? previous : undefined;
			},
			enabled: Boolean(id),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

export function createDailyVisibilityQuery(pltaId: () => string, enabled: () => boolean) {
	return createQuery(() => {
		const id = pltaId();

		return {
			queryKey: hydrologyQueryKeys.dailyVisibility(id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getDailyVisibility(id, { signal }),
			enabled: Boolean(id) && enabled(),
			// Daftar ini dibaca untuk disunting; pilihan operator lain yang baru
			// tersimpan tidak boleh tertimpa data basi.
			staleTime: 0,
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

/** `enabled` mencegah rentang yang pasti ditolak server (terbalik / > 60 bulan) dikirim. */
export function createMonthlyHydrologyOverviewQuery(
	period: () => HydrologyPeriod,
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const value = period();

		return {
			queryKey: hydrologyQueryKeys.monthlyOverview(value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getMonthlyOverview(value, { signal }),
			enabled: enabled(),
			staleTime: HYDROLOGY_STALE_TIME,
			refetchOnWindowFocus: false
		};
	});
}

/**
 * `enabled` terpisah dari `pltaId`: rentang yang pasti ditolak server (terbalik
 * atau lebih dari 60 bulan) tidak boleh dikirim.
 */
export function createMonthlyChartQuery(
	pltaId: () => string,
	period: () => HydrologyPeriod,
	enabled: () => boolean = () => true
) {
	return createQuery(() => {
		const id = pltaId();
		const value = period();

		return {
			queryKey: hydrologyQueryKeys.monthlyChart(id, value),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				hydrologyRepository.getMonthlyChart(value, id, { signal }),
			enabled: Boolean(id) && enabled(),
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
			await invalidateUploadAudit(queryClient);
		}
	}));
}

export function createDownloadMonthlyTemplateMutation() {
	return createMutation(() => ({
		mutationFn: ({ year, month }: { year: number; month: number }) =>
			hydrologyRepository.downloadMonthlyTemplate(year, month)
	}));
}

export function createDownloadDailyTemplateMutation() {
	return createMutation(() => ({
		mutationFn: ({ from, to, perHour }: { from: string; to?: string; perHour?: boolean }) =>
			hydrologyRepository.downloadDailyTemplate(from, to, { perHour })
	}));
}

/**
 * Satu berkas menulis banyak parameter lintas banyak PLTA — panel harian mana
 * pun bisa berubah, jadi seluruh cache hidrologi dianggap basi.
 */
export function createUploadDailyHydrologyExcelMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ file, emptyCells }: { file: File; emptyCells?: DailyEmptyCellMode }) =>
			hydrologyRepository.uploadDailyExcel(file, { emptyCells }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.all });
			await invalidateUploadAudit(queryClient);
		}
	}));
}

export function createDownloadMonthlyReportMutation() {
	return createMutation(() => ({
		mutationFn: (scope: MonthlyReportScope) => hydrologyRepository.downloadMonthlyReport(scope)
	}));
}

export function createDownloadDailyReportMutation() {
	return createMutation(() => ({
		mutationFn: (scope: DailyHydrologyReportScope) => hydrologyRepository.downloadDailyReport(scope)
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
			await invalidateUploadAudit(queryClient);
		}
	}));
}

/**
 * Penghapusan juga berlaku untuk seluruh PLTA. Cache gambar periode itu dibuang,
 * bukan diinvalidasi: memuat ulang hanya akan berakhir 404.
 */
export function createDeleteMonthlyHydrologyImageMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({
			year,
			month,
			kind
		}: {
			year: number;
			month: number;
			kind: MonthlyHydrologyImageKind;
		}) => hydrologyRepository.deleteMonthlyImage(year, month, kind),
		onSuccess: async (_, { year, month, kind }) => {
			queryClient.removeQueries({ queryKey: hydrologyQueryKeys.monthlyImage(year, month, kind) });
			await queryClient.invalidateQueries({ queryKey: hydrologyQueryKeys.all });
			await invalidateUploadAudit(queryClient);
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
			await invalidateUploadAudit(queryClient);
		}
	}));
}

/** Tata letak berlaku per PLTA; panel harian PLTA itu diambil ulang sesudahnya. */
export function createSetDailyVisibilityMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ pltaId, changes }: { pltaId: string; changes: DailyLayoutChanges }) =>
			hydrologyRepository.setDailyVisibility(pltaId, changes),
		onSuccess: async (visibility) => {
			await queryClient.invalidateQueries({
				queryKey: hydrologyQueryKeys.dashboardRoot(visibility.pltaId)
			});
		}
	}));
}

/** Nama metrik harian berlaku per PLTA; panel harian PLTA itu diambil ulang sesudahnya. */
export function createSetDailyLabelsMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ pltaId, labels }: { pltaId: string; labels: LabelChanges }) =>
			hydrologyRepository.setDailyLabels(pltaId, labels),
		onSuccess: async (visibility) => {
			await queryClient.invalidateQueries({
				queryKey: hydrologyQueryKeys.dashboardRoot(visibility.pltaId)
			});
		}
	}));
}

export function createMonthlyFieldLabelsQuery(enabled: () => boolean) {
	return createQuery(() => ({
		queryKey: hydrologyQueryKeys.monthlyFieldLabels(),
		queryFn: ({ signal }: { signal: AbortSignal }) =>
			hydrologyRepository.getMonthlyFieldLabels({ signal }),
		enabled: enabled(),
		// Dibaca untuk disunting; perubahan admin lain tidak boleh tertimpa data basi.
		staleTime: 0
	}));
}
