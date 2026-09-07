<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import IconPlus from '~icons/ph/plus';
	import IconSearch from '~icons/ph/magnifying-glass';

	import Badge, { type BadgeTone } from '$components/atoms/Badge.svelte';
	import Button from '$components/atoms/Button.svelte';
	import Select from '$components/atoms/Select.svelte';
	import ResourceTableSkeleton from '$components/skeletons/ResourceTableSkeleton.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import RefetchBar from '$components/ui/RefetchBar.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import TablePagination from '$components/ui/TablePagination.svelte';
	import { createPLTATagsQuery, getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import {
		createCreateReportMutation,
		createDownloadReportMutation,
		createReportsQuery,
		type Report,
		type ReportStatus,
		type ReportType
	} from '$features/reports';
	import { downloadBlob } from '$shared/lib/download';
	import {
		formatDayMonthYearTimeWIB,
		formatDayMonthYearWIB,
		getWIBDateParts
	} from '$shared/lib/date';
	import { notificationStore } from '$shared/lib/notification.svelte';

	const PAGE_LIMIT = 10;

	const MONTH_OPTIONS = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	].map((label, index) => ({ value: String(index + 1), label }));

	const REPORT_TYPES: Record<ReportType, string> = {
		daily: 'Harian',
		monthly: 'Bulanan',
		yearly: 'Tahunan'
	};

	const STATUS_META: Record<ReportStatus, { label: string; tone: BadgeTone }> = {
		pending: { label: 'Menunggu', tone: 'amber' },
		processing: { label: 'Diproses', tone: 'cyan' },
		completed: { label: 'Selesai', tone: 'green' },
		failed: { label: 'Gagal', tone: 'red' }
	};

	function getCurrentPeriod(): { month: number; year: number } {
		const parts = getWIBDateParts(new Date());
		if (!parts) return { month: 1, year: new Date().getFullYear() };
		return { month: parts.month, year: parts.year };
	}

	function monthBoundaries(year: number, month: number): { start: string; end: string } {
		const paddedMonth = String(month).padStart(2, '0');
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
		return {
			start: `${year}-${paddedMonth}-01`,
			end: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`
		};
	}

	function dateBoundary(date: string, endOfDay = false): string {
		return new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`).toISOString();
	}

	function formatParameterLabel(parameter: string): string {
		return parameter
			.replaceAll('_', ' ')
			.replace(/\b\w/g, (character) => character.toLocaleUpperCase('id-ID'));
	}

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message.trim()) return error.message;
		return 'Permintaan laporan gagal diproses.';
	}

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);
	const currentPeriod = getCurrentPeriod();

	let month = $state(String(currentPeriod.month));
	let year = $state(String(currentPeriod.year));
	let selectedParameters = $state<string[]>([]);
	let page = $state(1);
	let searchInput = $state('');
	let search = $state('');
	let isQuerySheetOpen = $state(false);

	const reportsQuery = createReportsQuery(() => ({
		page,
		limit: PAGE_LIMIT,
		search: search || undefined
	}));

	const tagsQuery = createPLTATagsQuery(
		() => pltaId,
		() => ({ page: 1, limit: 200, enabled: true })
	);

	const createMutation = createCreateReportMutation();
	const downloadMutation = createDownloadReportMutation();

	/**
	 * Satu parameter bisa muncul di banyak tag (beberapa stasiun, satuan berbeda),
	 * jadi daftarnya diringkas per nama parameter — bukan per tag.
	 */
	const parameterOptions = $derived.by(() => {
		if (tagsQuery.isPlaceholderData) return [];

		// Objek biasa, bukan Map: dibangun ulang tiap kali daftar tag berubah dan
		// tidak pernah dimutasi setelah itu, jadi tidak perlu struktur reaktif.
		const grouped: Record<
			string,
			{ value: string; label: string; units: string[]; stations: string[] }
		> = {};

		for (const tag of tagsQuery.data?.items ?? []) {
			const value = tag.parameter.trim();
			if (!value) continue;

			const existing = (grouped[value] ??= {
				value,
				label: formatParameterLabel(value),
				units: [],
				stations: []
			});
			const unit = tag.unit.trim();
			const station = tag.station.trim();
			if (unit && !existing.units.includes(unit)) existing.units.push(unit);
			if (station && !existing.stations.includes(station)) existing.stations.push(station);
		}

		return Object.values(grouped).sort((left, right) =>
			left.label.localeCompare(right.label, 'id-ID')
		);
	});

	const yearOptions = $derived(
		Array.from(
			{ length: currentPeriod.year - 1998 },
			(_, index) => currentPeriod.year + 1 - index
		).map((value) => ({ value: String(value), label: String(value) }))
	);

	const reports = $derived(reportsQuery.data?.items ?? []);
	const total = $derived(reportsQuery.data?.total ?? 0);
	const totalPages = $derived(Math.max(reportsQuery.data?.pages ?? 1, 1));

	function applySearch(event: SubmitEvent) {
		event.preventDefault();
		search = searchInput.trim();
		page = 1;
	}

	function clearSearch() {
		searchInput = '';
		search = '';
		page = 1;
	}

	function toggleParameter(parameter: string) {
		selectedParameters = selectedParameters.includes(parameter)
			? selectedParameters.filter((item) => item !== parameter)
			: [...selectedParameters, parameter];
	}

	async function createReport(event: SubmitEvent) {
		event.preventDefault();
		const period = monthBoundaries(Number(year), Number(month));

		try {
			await createMutation.mutateAsync({
				type: 'monthly',
				template: 'timeseries',
				pltaId,
				periodStart: dateBoundary(period.start),
				periodEnd: dateBoundary(period.end, true),
				parameters: selectedParameters.length > 0 ? selectedParameters : undefined
			});
			page = 1;
			isQuerySheetOpen = false;
			notificationStore.addToast({
				type: 'success',
				message: 'Laporan time series bulanan masuk antrean backend.'
			});
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}

	async function downloadReport(report: Report) {
		try {
			const blob = await downloadMutation.mutateAsync(report.id);
			downloadBlob(blob, `laporan-timeseries-${report.periodStart.slice(0, 7)}.xlsx`);
			notificationStore.addToast({
				type: 'success',
				message: 'File laporan Excel berhasil diunduh.'
			});
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}
</script>

{#snippet tableHead()}
	<thead>
		<tr class="h-9 border-b border-border-subtle bg-surface-overlay">
			<th class="table-head-cell px-4 text-left">Laporan</th>
			<th class="table-head-cell px-4 text-left">Periode</th>
			<th class="table-head-cell px-4 text-left">Dibuat</th>
			<th class="table-head-cell px-4 text-left">Status</th>
			<th class="table-head-cell px-4 text-right">Aksi</th>
		</tr>
	</thead>
{/snippet}

<div class="flex flex-1 flex-col gap-6">
	<PageHeader title="Laporan" description={`Laporan time series bulanan PLTA ${displayName}`}>
		{#snippet actions()}
			<PlantSwitcher page="laporan" />
			<Button
				type="button"
				size="lg"
				onclick={() => (isQuerySheetOpen = true)}
				class="whitespace-nowrap"
			>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				Buat Laporan
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex flex-col gap-2.5 border-b border-border-subtle pb-4 sm:flex-row sm:items-center">
		<form onsubmit={applySearch} class="flex min-w-0 items-center gap-2 sm:w-72">
			<div class="relative flex min-w-0 flex-1 items-center">
				<IconSearch class="pointer-events-none absolute left-3 size-4 shrink-0 text-text-muted" />
				<input
					type="search"
					bind:value={searchInput}
					maxlength={100}
					placeholder="Cari nama laporan…"
					class="field h-9 pl-9 text-[13px]"
				/>
			</div>
			<button type="submit" class="btn btn-ghost btn-sm h-9 shrink-0">Cari</button>
			{#if search}
				<button
					type="button"
					onclick={clearSearch}
					class="h-9 shrink-0 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-overlay"
				>
					Bersihkan
				</button>
			{/if}
		</form>
		{#if !reportsQuery.isError}
			<span class="shrink-0 text-xs text-text-muted sm:ml-auto">{total} laporan</span>
		{/if}
	</div>

	<section
		class="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
	>
		<RefetchBar isRefetching={reportsQuery.isFetching && !reportsQuery.isLoading} />

		{#if reportsQuery.isError}
			<ErrorState
				title="Daftar laporan belum bisa dimuat"
				description={errorMessage(reportsQuery.error)}
				isRetrying={reportsQuery.isFetching}
				onRetry={() => void reportsQuery.refetch()}
			/>
		{:else if reportsQuery.isLoading}
			<div class="overflow-x-auto" role="status" aria-label="Memuat daftar laporan">
				<table class="w-full min-w-[900px] border-collapse text-left">
					{@render tableHead()}
					<tbody><ResourceTableSkeleton columns={5} rows={PAGE_LIMIT} /></tbody>
				</table>
				<span class="sr-only">Memuat daftar laporan...</span>
			</div>
		{:else if reports.length === 0}
			<div class="p-5">
				<EmptyState
					title={search ? 'Laporan tidak ditemukan' : 'Belum ada laporan'}
					description={search
						? 'Coba kata kunci lain atau kosongkan pencarian.'
						: 'Laporan yang Anda buat akan muncul di daftar ini.'}
				/>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px] border-collapse text-left">
					{@render tableHead()}
					<tbody class="divide-y divide-surface-overlay">
						{#each reports as report (report.id)}
							{@const statusMeta = STATUS_META[report.status]}
							<tr class="hover:bg-surface-base/70">
								<td class="px-4 py-2.5">
									<p class="text-sm font-medium text-text-primary">
										{report.template === 'timeseries' ? 'Laporan Time Series' : 'Laporan Historis'}
									</p>
									<p class="mt-0.5 max-w-md truncate text-xs text-text-muted">
										{REPORT_TYPES[report.type]} · {report.parameters
											?.map(formatParameterLabel)
											.join(', ') || 'semua parameter'}
									</p>
								</td>
								<td class="px-4 py-2.5 font-mono text-xs text-text-secondary tabular-nums">
									{formatDayMonthYearWIB(report.periodStart)} – {formatDayMonthYearWIB(
										report.periodEnd
									)}
								</td>
								<td class="px-4 py-2.5 font-mono text-xs text-text-secondary tabular-nums">
									{formatDayMonthYearTimeWIB(report.createdAt)}
								</td>
								<td class="px-4 py-2.5">
									<Badge tone={statusMeta.tone} spinning={report.status === 'processing'}>
										{statusMeta.label}
									</Badge>
								</td>
								<td class="px-4 py-2.5 text-right">
									<button
										type="button"
										disabled={report.status !== 'completed' || downloadMutation.isPending}
										onclick={() => void downloadReport(report)}
										class="btn btn-ghost btn-sm text-brand-primary-strong"
									>
										<IconDownload class="size-3.5" />
										Unduh Excel
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if !reportsQuery.isLoading && !reportsQuery.isError}
			<TablePagination
				{page}
				{totalPages}
				{total}
				pageSize={PAGE_LIMIT}
				itemLabel="laporan"
				isBusy={reportsQuery.isFetching}
				onPrevious={() => (page = Math.max(page - 1, 1))}
				onNext={() => (page = Math.min(page + 1, totalPages))}
			/>
		{/if}
	</section>
</div>

<Sheet
	isOpen={isQuerySheetOpen}
	title="Buat Laporan Bulanan"
	onClose={() => (isQuerySheetOpen = false)}
>
	{#snippet description()}
		Laporan hidrologi · PLTA {displayName}
	{/snippet}

	<form
		id="report-query-form"
		onsubmit={(event) => void createReport(event)}
		class="flex flex-col gap-5"
	>
		<div class="grid gap-2.5 sm:grid-cols-2">
			<Select label="Bulan" bind:value={month} options={MONTH_OPTIONS} />
			<Select label="Tahun" bind:value={year} options={yearOptions} />
		</div>

		<fieldset class="flex flex-col gap-2">
			<legend class="field-label">
				Parameter <span class="font-normal text-text-muted">· kosongkan berarti semua</span>
			</legend>
			<p class="mb-1 text-xs leading-relaxed text-text-muted">
				Pilihan berasal dari tag aktif PLTA.
			</p>

			{#if tagsQuery.isLoading || tagsQuery.isPlaceholderData}
				<p class="loading-text" role="status">Memuat parameter…</p>
			{:else if tagsQuery.isError}
				<p
					class="rounded-lg bg-status-danger-soft px-3 py-2 text-sm text-status-danger-strong"
					role="alert"
				>
					Parameter tag belum dapat dimuat.
				</p>
			{:else if parameterOptions.length === 0}
				<p class="rounded-lg bg-surface-overlay px-3 py-2 text-sm text-text-muted">
					Belum ada tag aktif pada PLTA ini.
				</p>
			{:else}
				<div class="max-h-72 overflow-y-auto border-t border-border-subtle pr-1">
					{#each parameterOptions as option (option.value)}
						<label
							class="flex cursor-pointer items-center gap-2.5 border-b border-surface-overlay py-2 last:border-b-0"
						>
							<input
								type="checkbox"
								checked={selectedParameters.includes(option.value)}
								onchange={() => toggleParameter(option.value)}
								class="size-4 shrink-0 accent-brand-primary-strong"
							/>
							<span class="min-w-0 flex-1">
								<span class="block text-sm text-text-secondary">{option.label}</span>
								<span class="mt-0.5 block truncate text-xs text-text-muted">
									{option.stations.length > 0 ? `${option.stations.length} stasiun` : 'Tag aktif'}
									{option.units.length > 0 ? ` · ${option.units.join(', ')}` : ''}
								</span>
							</span>
						</label>
					{/each}
				</div>
			{/if}
		</fieldset>
	</form>

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				onclick={() => (isQuerySheetOpen = false)}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="submit"
				form="report-query-form"
				disabled={createMutation.isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				{createMutation.isPending ? 'Membuat…' : 'Buat Laporan'}
			</Button>
		</div>
	{/snippet}
</Sheet>
