<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconDownload from '~icons/ph/download-simple';
	import IconFileXls from '~icons/ph/file-xls';
	import IconX from '~icons/ph/x';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import {
		createDownloadDailyReportMutation,
		createDownloadMonthlyReportMutation,
		getHydrologyErrorMessage,
		type DailyReportPanel
	} from '$features/hydrology';
	import { createPlantCatalogQuery, getPlantDisplayName } from '$features/plta';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		ALL_MONTHS,
		ALL_PANELS,
		ALL_PLANTS,
		NO_RANGE,
		REPORT_END_MONTH_OPTIONS,
		REPORT_END_YEAR_OPTIONS,
		REPORT_MONTH_OPTIONS,
		REPORT_YEAR_OPTIONS,
		hasReportRange,
		nextReportSearch,
		parseReportEndMonth,
		parseReportEndYear,
		parseReportMonth,
		parseReportYear,
		reportFilename,
		reportPeriodLabel,
		reportRangeError
	} from '../../../hydrology-report';

	/**
	 * Laporan Excel hidrologi SELURUH PLTA — dulu bagian "Unduh laporan" di
	 * Telemetering › Rekap Hidrologi. Karena itu cakupannya dipilih di sini,
	 * bukan lewat PlantSwitcher di kepala halaman: bawaannya seluruh PLTA, dan
	 * PLTA hanya dipilih bila laporan ingin dipersempit.
	 *
	 * Periode dan cakupan tetap disimpan di URL (`?tahun=`, `?bulan=`,
	 * `?plta=`) supaya tautan lama ke Rekap bisa dialihkan ke sini tanpa
	 * kehilangan pilihannya.
	 *
	 * Sejak 23 Okt 2026 seluruh pemilih periode (termasuk "Sampai") dan cakupan
	 * satu baris di atas; dulu "Sampai" ada di dalam kartu laporan bulanan,
	 * sehingga enam pemilih tersebar di tiga tempat. Kartu harian hanya
	 * menyisakan pilihan panel, satu-satunya yang khusus laporan itu.
	 */

	const CURRENT_YEAR = new Date().getFullYear();
	// Akhir rentang (REPORT_END_*) hanya untuk laporan bulanan: server tidak
	// mendukung rentang pada laporan harian.
	const PANEL_OPTIONS: { value: DailyReportPanel | typeof ALL_PANELS; label: string }[] = [
		{ value: ALL_PANELS, label: 'Semua panel' },
		{ value: 'hulu', label: 'Hulu' },
		{ value: 'dam', label: 'Bendungan' },
		{ value: 'hilir', label: 'Hilir' }
	];

	const plantsQuery = createPlantCatalogQuery();
	const monthlyReportMutation = createDownloadMonthlyReportMutation();
	const dailyReportMutation = createDownloadDailyReportMutation();

	const year = $derived(parseReportYear(page.url.searchParams.get('tahun'), CURRENT_YEAR));
	/** `undefined` = sepanjang tahun. Tanpa `?bulan=` sama sekali, bulan berjalan. */
	const month = $derived(
		parseReportMonth(page.url.searchParams.get('bulan'), new Date().getMonth() + 1)
	);
	const endYear = $derived(parseReportEndYear(page.url.searchParams.get('tahun_akhir')));
	const endMonth = $derived(parseReportEndMonth(page.url.searchParams.get('bulan_akhir')));
	const monthlyPeriod = $derived({ year, month, endYear, endMonth });
	/** Rentang yang pasti ditolak server menahan tombol unduh bulanan. */
	const rangeError = $derived(reportRangeError(monthlyPeriod));
	const monthlyPeriodLabel = $derived(reportPeriodLabel(year, month, endYear, endMonth));
	const plants = $derived(plantsQuery.data ?? []);
	const selectedPlant = $derived(
		plants.find((plant) => plant.id === page.url.searchParams.get('plta'))
	);

	let panel = $state<DailyReportPanel | typeof ALL_PANELS>(ALL_PANELS);

	const periodLabel = $derived(reportPeriodLabel(year, month));
	const scopeLabel = $derived(
		selectedPlant ? `PLTA ${getPlantDisplayName(selectedPlant)}` : 'seluruh PLTA'
	);
	const plantOptions = $derived([
		{ value: ALL_PLANTS, label: 'Seluruh PLTA' },
		...plants.map((plant) => ({
			value: plant.id,
			label: `${getPlantDisplayName(plant)} · ${plant.code}`
		}))
	]);

	type FilterKey = 'tahun' | 'bulan' | 'plta' | 'tahun_akhir' | 'bulan_akhir';

	function setFilter(key: FilterKey, value: string) {
		setFilters({ [key]: value });
	}

	/**
	 * Beberapa parameter dalam SATU navigasi: dua `goto` berturut-turut sama-sama
	 * membaca URL lama, sehingga yang kedua mengembalikan perubahan yang pertama.
	 */
	function setFilters(changes: Partial<Record<FilterKey, string>>) {
		void goto(nextReportSearch(page.url.searchParams, changes), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	async function downloadMonthlyReport() {
		try {
			if (rangeError) return;
			const blob = await monthlyReportMutation.mutateAsync({
				year,
				month,
				endYear,
				endMonth,
				pltaId: selectedPlant?.id
			});
			downloadBlob(
				blob,
				reportFilename({
					kind: 'bulanan',
					year,
					month,
					endYear,
					endMonth,
					plantCode: selectedPlant?.code
				})
			);
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
		}
	}

	async function downloadDailyReport() {
		const selectedPanel = panel === ALL_PANELS ? undefined : panel;
		try {
			const blob = await dailyReportMutation.mutateAsync({
				year,
				month,
				panel: selectedPanel,
				pltaId: selectedPlant?.id
			});
			downloadBlob(
				blob,
				reportFilename({
					kind: 'harian',
					year,
					month,
					panel: selectedPanel,
					plantCode: selectedPlant?.code
				})
			);
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
		}
	}
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-col gap-2 border-b border-border-subtle pb-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
			<Select
				label="Bulan"
				value={month ? String(month) : ALL_MONTHS}
				onValueChange={(value) => setFilter('bulan', value)}
				options={REPORT_MONTH_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[180px]"
			/>
			<Select
				label="Tahun"
				value={String(year)}
				onValueChange={(value) => setFilter('tahun', value)}
				options={REPORT_YEAR_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[110px]"
			/>
			<div class="flex flex-col gap-1.5">
				<span class="field-label"
					>Sampai <span class="font-normal text-text-muted">· bulanan</span></span
				>
				<div class="flex items-center gap-2">
					<div class="w-[130px] shrink-0">
						<Select
							ariaLabel="Bulan akhir laporan bulanan"
							value={endMonth ? String(endMonth) : NO_RANGE}
							onValueChange={(value) => setFilter('bulan_akhir', value)}
							options={REPORT_END_MONTH_OPTIONS}
							controlSize="sm"
						/>
					</div>
					<div class="w-[96px] shrink-0">
						<Select
							ariaLabel="Tahun akhir laporan bulanan"
							value={endYear ? String(endYear) : NO_RANGE}
							onValueChange={(value) => setFilter('tahun_akhir', value)}
							options={REPORT_END_YEAR_OPTIONS}
							controlSize="sm"
						/>
					</div>
					{#if hasReportRange(monthlyPeriod)}
						<button
							type="button"
							onclick={() => setFilters({ tahun_akhir: NO_RANGE, bulan_akhir: NO_RANGE })}
							aria-label="Hapus rentang"
							title="Hapus rentang"
							class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
						>
							<IconX class="size-3.5" aria-hidden="true" />
						</button>
					{/if}
				</div>
			</div>
			<Select
				label="Cakupan PLTA"
				value={selectedPlant?.id ?? ALL_PLANTS}
				onValueChange={(value) => setFilter('plta', value)}
				options={plantOptions}
				disabled={plantsQuery.isPending}
				controlSize="sm"
				class="w-full sm:w-[240px]"
			/>
		</div>
		{#if rangeError}
			<p role="alert" class="text-xs text-status-danger-strong">{rangeError}</p>
		{/if}
	</div>

	<ul
		class="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-raised"
	>
		<li class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-start gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-muted"
				>
					<IconFileXls class="size-[18px]" aria-hidden="true" />
				</span>
				<div class="min-w-0">
					<h3 class="card-title">Laporan Hidrologi Bulanan</h3>
					<p class="mt-0.5 text-xs text-text-muted">
						{monthlyPeriodLabel} · {scopeLabel}. Rekap per PLTA dengan status pencapaian, plus
						lembar ringkasan.
					</p>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={monthlyReportMutation.isPending || Boolean(rangeError)}
				onclick={() => void downloadMonthlyReport()}
				class="shrink-0 whitespace-nowrap text-brand-primary-strong"
			>
				{#snippet leftIcon()}<IconDownload class="size-3.5" />{/snippet}
				{monthlyReportMutation.isPending ? 'Menyiapkan…' : 'Unduh Excel'}
			</Button>
		</li>

		<li class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-start gap-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-muted"
				>
					<IconFileXls class="size-[18px]" aria-hidden="true" />
				</span>
				<div class="min-w-0">
					<h3 class="card-title">Laporan Hidrologi Harian</h3>
					<p class="mt-0.5 text-xs text-text-muted">
						{periodLabel} · {scopeLabel}. Satu lembar per panel, satu baris per PLTA per tanggal.
						{#if hasReportRange(monthlyPeriod)}
							<span class="text-status-warning-strong">Tidak mendukung rentang.</span>
						{/if}
					</p>
				</div>
			</div>
			<div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
				<Select
					ariaLabel="Panel laporan harian"
					bind:value={panel}
					options={PANEL_OPTIONS}
					disabled={dailyReportMutation.isPending}
					controlSize="sm"
					class="w-full sm:w-[160px]"
				/>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={dailyReportMutation.isPending}
					onclick={() => void downloadDailyReport()}
					class="whitespace-nowrap text-brand-primary-strong"
				>
					{#snippet leftIcon()}<IconDownload class="size-3.5" />{/snippet}
					{dailyReportMutation.isPending ? 'Menyiapkan…' : 'Unduh Excel'}
				</Button>
			</div>
		</li>
	</ul>
</div>
