<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconDownload from '~icons/ph/download-simple';
	import IconFileXls from '~icons/ph/file-xls';

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
	<div
		class="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:flex-wrap sm:items-end"
	>
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
			class="w-full sm:w-[140px]"
		/>
		<Select
			label="Cakupan PLTA"
			value={selectedPlant?.id ?? ALL_PLANTS}
			onValueChange={(value) => setFilter('plta', value)}
			options={plantOptions}
			disabled={plantsQuery.isPending}
			controlSize="sm"
			class="w-full sm:w-[260px]"
		/>
		<span class="text-xs text-text-muted sm:ml-auto">{periodLabel} · {scopeLabel}</span>
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
					<p class="mt-0.5 text-xs leading-relaxed text-text-muted">
						Lembar DATA berisi rekap tiap PLTA per bulan, lengkap dengan persentase dan status
						pencapaian. Lembar RINGKASAN berisi rata-rata seluruh PLTA dan jumlah tercapai/tidak.
					</p>
					<div class="mt-3 flex flex-wrap items-end gap-2">
						<span class="field-label w-full sm:w-auto sm:pb-2.5">Sampai (opsional)</span>
						<div class="w-[150px] shrink-0">
							<Select
								ariaLabel="Bulan akhir laporan bulanan"
								value={endMonth ? String(endMonth) : NO_RANGE}
								onValueChange={(value) => setFilter('bulan_akhir', value)}
								options={REPORT_END_MONTH_OPTIONS}
								controlSize="sm"
							/>
						</div>
						<div class="w-[110px] shrink-0">
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
								class="cursor-pointer pb-2.5 text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
							>
								Hapus rentang
							</button>
						{/if}
					</div>
					{#if rangeError}
						<p role="alert" class="mt-1.5 text-xs text-status-danger-strong">{rangeError}</p>
					{:else if hasReportRange(monthlyPeriod)}
						<p class="mt-1.5 text-xs text-text-muted">Periode laporan: {monthlyPeriodLabel}</p>
					{/if}
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
					<p class="mt-0.5 text-xs leading-relaxed text-text-muted">
						Satu lembar per panel, satu baris per PLTA per tanggal. Curah hujan dijumlah, besaran
						lain dirata-rata; pembacaan dari alat yang rusak tidak ikut.
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
