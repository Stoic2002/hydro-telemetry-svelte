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
		parseReportMonth,
		parseReportYear,
		reportFilename,
		reportPeriodLabel
	} from '../../../hydrology-report';
	import { MONTHS } from '../telemetering/presentation';

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
	const MONTH_OPTIONS = [
		{ value: ALL_MONTHS, label: 'Sepanjang tahun' },
		...MONTHS.map((label, index) => ({ value: String(index + 1), label }))
	];
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);
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

	function setFilter(key: 'tahun' | 'bulan' | 'plta', value: string) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		if (key === 'plta' && value === ALL_PLANTS) params.delete('plta');
		else params.set(key, value);
		void goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	async function downloadMonthlyReport() {
		try {
			const blob = await monthlyReportMutation.mutateAsync({
				year,
				month,
				pltaId: selectedPlant?.id
			});
			downloadBlob(
				blob,
				reportFilename({ kind: 'bulanan', year, month, plantCode: selectedPlant?.code })
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
			options={MONTH_OPTIONS}
			controlSize="sm"
			class="w-full sm:w-[180px]"
		/>
		<Select
			label="Tahun"
			value={String(year)}
			onValueChange={(value) => setFilter('tahun', value)}
			options={YEAR_OPTIONS}
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
						Lembar DATA berisi satu baris per PLTA per bulan, lengkap dengan persentase dan status
						pencapaian. Lembar RINGKASAN berisi rata-rata armada dan jumlah tercapai/tidak.
					</p>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={monthlyReportMutation.isPending}
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
