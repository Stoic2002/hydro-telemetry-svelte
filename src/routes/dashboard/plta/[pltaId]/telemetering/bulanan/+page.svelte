<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconInfo from '~icons/ph/info';
	import IconPencil from '~icons/ph/pencil-line';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canEditHydrologyData, canUploadMonthlyHydrology } from '$features/auth';
	import {
		createMonthlyChartQuery,
		createMonthlyHydrologyImageQuery,
		createMonthlyHydrologyPanelQuery,
		getHydrologyErrorMessage,
		type MonthlyHydrologyImageKind
	} from '$features/hydrology';
	import MonthlyHydrologySheet from '$features/hydrology/components/MonthlyHydrologySheet.svelte';
	import { UPLOAD_PATH, getActivePLTA, getUploadPath } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import { parseReportMonth, parseReportYear } from '../../../../hydrology-report';
	import { createObjectUrl } from '$shared/lib/object-url.svelte';
	import ForecastMapCard from '../ForecastMapCard.svelte';
	import MonthlyAccumulationChart from '../MonthlyAccumulationChart.svelte';
	import MonthlyComparisonTable from '../MonthlyComparisonTable.svelte';
	import { MONTHS, buildMonthlyComparison } from '../presentation';

	const CURRENT_YEAR = new Date().getFullYear();
	const CURRENT_MONTH = new Date().getMonth() + 1;
	const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);

	/**
	 * Periode dipilih operator, bukan selalu bulan berjalan — inilah penelusuran
	 * riwayatnya setelah tabel 12 bulan disembunyikan.
	 *
	 * Disimpan di query string (`?tahun=&bulan=`), bukan state komponen: pemilih
	 * PLTA membawa query string ke PLTA berikutnya, jadi periode yang sudah
	 * dipilih tidak kembali ke bulan berjalan saat operator berpindah PLTA.
	 * Nilai yang tidak valid atau hilang jatuh ke tahun/bulan berjalan.
	 */
	const year = $derived(String(parseReportYear(page.url.searchParams.get('tahun'), CURRENT_YEAR)));
	const month = $derived(
		String(parseReportMonth(page.url.searchParams.get('bulan'), CURRENT_MONTH) ?? CURRENT_MONTH)
	);
	let isMonthlySheetOpen = $state(false);

	const monthLabel = $derived(MONTHS[Number(month) - 1]);
	const canUploadImage = $derived(canUploadMonthlyHydrology(authStore.user));
	// Viewer hanya membaca ringkasan; tombol dan form isiannya tidak dirender.
	const canEditData = $derived(canEditHydrologyData(authStore.user));

	const panelQuery = createMonthlyHydrologyPanelQuery(
		() => pltaId,
		() => Number(year),
		() => Number(month)
	);

	const record = $derived(panelQuery.data ?? undefined);

	// Grafik akumulasi mengikuti tahun terpilih (Januari–Desember). Bulan yang
	// belum diisi tetap ada di sumbu X dengan nilai kosong.
	const chartQuery = createMonthlyChartQuery(
		() => pltaId,
		() => ({ year: Number(year) })
	);

	// `id` null berarti baris bulanan PLTA ini belum ada, sedangkan path gambar
	// tetap terisi karena gambarnya global — keduanya tidak boleh dicampur.
	const hasMonthlyRecord = $derived(Boolean(record?.id));

	/**
	 * Keempat gambar BMKG tampil sekaligus, satu baris per kelompok: prediksi
	 * dan realisasi dibandingkan berdampingan tanpa berpindah tab (7 Okt 2026).
	 * Gambar yang path-nya kosong tidak diunduh.
	 */
	const IMAGE_ROWS: {
		group: string;
		slots: { kind: MonthlyHydrologyImageKind; title: string }[];
	}[] = [
		{
			group: 'Prediksi',
			slots: [
				{ kind: 'prediksi_curah_hujan', title: 'Curah Hujan' },
				{ kind: 'prediksi_sifat_hujan', title: 'Sifat Hujan' }
			]
		},
		{
			group: 'Realisasi',
			slots: [
				{ kind: 'realisasi_curah_hujan', title: 'Curah Hujan' },
				{ kind: 'realisasi_sifat_hujan', title: 'Sifat Hujan' }
			]
		}
	];

	const imageRows = IMAGE_ROWS.map((row) => ({
		...row,
		slots: row.slots.map((slot) => {
			const query = createMonthlyHydrologyImageQuery(
				() => Number(year),
				() => Number(month),
				() => slot.kind,
				() => Boolean(record?.images[slot.kind])
			);
			return { ...slot, query, url: createObjectUrl(() => query.data) };
		})
	}));

	const comparison = $derived(buildMonthlyComparison(record, monthLabel));

	async function setPeriod(key: 'tahun' | 'bulan', value: string) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		params.set(key, value);

		await goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering · Hidrologi Bulanan"
		title={displayName}
		description="Prediksi dan realisasi kondisi hidrologi bulanan"
	>
		{#snippet actions()}
			<PlantSwitcher page="telemetering/bulanan" />
		{/snippet}
	</PageHeader>

	<section>
		<h2 class="section-title">Periode</h2>
		<div class="mt-2.5 flex flex-wrap items-end gap-3">
			<Select
				label="Bulan"
				value={month}
				onValueChange={(next) => void setPeriod('bulan', next)}
				options={MONTH_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[180px]"
			/>
			<Select
				label="Tahun"
				value={year}
				onValueChange={(next) => void setPeriod('tahun', next)}
				options={YEAR_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[140px]"
			/>
		</div>
	</section>

	{#if panelQuery.isError}
		<Banner tone="warning" title="Data bulanan belum dapat dimuat">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getHydrologyErrorMessage(panelQuery.error)}
				<button
					type="button"
					onclick={() => void panelQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{/if}

	<div class="grid gap-6 xl:grid-cols-2">
		<section>
			<div class="flex items-center justify-between gap-3">
				<h2 class="card-title">Ringkasan {monthLabel} {year}</h2>
				{#if canEditData}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={panelQuery.isLoading}
						onclick={() => (isMonthlySheetOpen = true)}
						class="shrink-0 whitespace-nowrap text-brand-primary-strong"
					>
						{#snippet leftIcon()}<IconPencil class="size-3.5" />{/snippet}
						{hasMonthlyRecord ? 'Edit data' : 'Input data'}
					</Button>
				{/if}
			</div>

			<div class="mt-2.5">
				{#if panelQuery.isLoading}
					<p class="loading-text py-4" role="status">Memuat ringkasan…</p>
				{:else}
					<MonthlyComparisonTable {comparison} />
				{/if}
			</div>

			{#if canUploadImage}
				<a
					href={UPLOAD_PATH}
					class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary-strong transition-colors hover:text-brand-primary-pressed"
				>
					<IconUpload class="size-3.5" />
					Butuh mengisi banyak PLTA sekaligus? Buka Upload
				</a>
			{/if}
		</section>

		<section>
			<div class="flex items-center justify-between gap-3">
				<h2 class="card-title">Gambar Hujan</h2>
				<span class="shrink-0 text-xs text-text-muted">{monthLabel} {year}</span>
			</div>

			<div class="mt-2.5 flex flex-col gap-3">
				{#each imageRows as row (row.group)}
					<div>
						<p class="table-head-cell mb-1.5">{row.group}</p>
						<div class="grid grid-cols-2 gap-3">
							{#each row.slots as slot (slot.kind)}
								<ForecastMapCard
									title={slot.title}
									subtitle={`${row.group} · ${monthLabel} ${year}`}
									imageUrl={slot.url.current}
									isLoading={panelQuery.isLoading || slot.query.isLoading}
									isError={slot.query.isError}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<p class="mt-2 text-xs text-text-muted">
				Gambar sama untuk seluruh PLTA.{#if canUploadImage}
					<a
						href={getUploadPath('prakiraan')}
						class="font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
					>
						Unggah dari menu Upload</a
					>.
				{/if}
			</p>
		</section>
	</div>

	<section>
		<div class="flex items-center justify-between gap-3">
			<h2 class="card-title">Akumulasi produksi {year}</h2>
			<span class="shrink-0 text-xs text-text-muted">Target vs realisasi, MWh</span>
		</div>
		<div class="mt-2.5">
			<MonthlyAccumulationChart
				chart={chartQuery.data}
				isLoading={chartQuery.isLoading}
				isError={chartQuery.isError}
				onRetry={() => void chartQuery.refetch()}
			/>
		</div>
	</section>

	<div class="flex items-start gap-2">
		<IconInfo class="mt-0.5 size-3.5 shrink-0 text-text-muted" />
		<p class="max-w-[88ch] text-xs leading-relaxed text-text-muted">
			Prediksi hidrologi belum mempertimbangkan kebutuhan alokasi air, kesiapan unit pembangkit, dan
			kebutuhan sistem kelistrikan.
		</p>
	</div>
</div>

{#if canEditData && isMonthlySheetOpen}
	<MonthlyHydrologySheet
		isOpen
		{pltaId}
		plantName={displayName}
		year={Number(year)}
		month={Number(month)}
		{monthLabel}
		{record}
		onClose={() => (isMonthlySheetOpen = false)}
	/>
{/if}
