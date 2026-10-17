<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconSliders from '~icons/ph/sliders-horizontal';

	import Button from '$components/controls/Button.svelte';
	import SegmentedControl from '$components/controls/SegmentedControl.svelte';
	import Select from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canConfigureDisplay } from '$features/auth';
	import { getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import {
		alignTrendRange,
		createPlantTrendListQuery,
		type TrendResolution
	} from '$features/trends';
	import TrendListSheet from '$features/trends/components/TrendListSheet.svelte';
	import ParameterTrendView from './ParameterTrendView.svelte';
	import PlantTrendBoard from './PlantTrendBoard.svelte';
	import { selectTrendChart, trendChartOptions } from './plant-trend';
	import {
		TREND_COMPARISONS,
		comparisonOffsetMs,
		formatRangeLabel,
		isTrendComparison,
		shiftRange
	} from './comparison';

	const TREND_PERIODS = ['24 Jam Terakhir', '7 Hari Terakhir', '30 Hari Terakhir'] as const;
	type TrendPeriod = (typeof TREND_PERIODS)[number];

	function isTrendPeriod(value: string | null): value is TrendPeriod {
		return TREND_PERIODS.some((period) => period === value);
	}

	/**
	 * Label tampilan pendek. Nilai URL tetap kalimat lengkap supaya tautan lama
	 * berlaku; "Terakhir" di setiap tombol dulu membuat tab terpotong di ponsel.
	 */
	const PERIOD_LABEL: Record<TrendPeriod, string> = {
		'24 Jam Terakhir': '24 jam',
		'7 Hari Terakhir': '7 hari',
		'30 Hari Terakhir': '30 hari'
	};

	/**
	 * Grafik beresolusi jam disegarkan tiap 5 menit: dibuka di layar ruang
	 * kontrol, grafik 24 jam dulu diam-diam basi. 30 hari (per hari) tidak.
	 */
	const REFRESH_MS = 5 * 60 * 1_000;

	function periodConfig(period: TrendPeriod): { durationMs: number; resolution: TrendResolution } {
		if (period === '24 Jam Terakhir') return { durationMs: 24 * 60 * 60 * 1_000, resolution: '1h' };
		if (period === '7 Hari Terakhir') {
			return { durationMs: 7 * 24 * 60 * 60 * 1_000, resolution: '1h' };
		}
		return { durationMs: 30 * 24 * 60 * 60 * 1_000, resolution: '1d' };
	}

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);
	const canConfigure = $derived(canConfigureDisplay(authStore.user));

	let isListSheetOpen = $state(false);

	/** Filter disimpan di URL supaya tautan ke grafik tertentu bisa dibagikan. */
	const period = $derived.by(() => {
		const value = page.url.searchParams.get('period');
		return isTrendPeriod(value) ? value : TREND_PERIODS[0];
	});
	const parameterParam = $derived(page.url.searchParams.get('parameter'));
	const chartParam = $derived(page.url.searchParams.get('grafik'));
	const comparisonMode = $derived.by(() => {
		const value = page.url.searchParams.get('compare');
		return isTrendComparison(value) ? value : 'none';
	});

	/**
	 * Daftar tren per PLTA (13 Okt 2026): admin menetapkan item dan
	 * pengelompokannya, dan seluruh grafiknya datang dari satu panggilan. PLTA
	 * yang daftarnya belum diatur memakai tampilan lama — satu parameter dari
	 * daftar tag — supaya halamannya tidak kosong.
	 */
	const listQuery = createPlantTrendListQuery(() => pltaId);
	const chartOptions = $derived(listQuery.data ? trendChartOptions(listQuery.data) : []);
	const selectedChart = $derived(
		listQuery.data ? selectTrendChart(listQuery.data, chartOptions, chartParam) : undefined
	);
	const isConfigured = $derived(Boolean(listQuery.data?.isConfigured && selectedChart));

	const refreshMs = $derived(periodConfig(period).resolution === '1d' ? false : REFRESH_MS);

	/**
	 * Jam halaman. Rentang dibulatkan ke akhir jam berjalan, jadi menyegarkan
	 * data saja tidak menggeser jendelanya — jam ini yang menggesernya begitu
	 * jam berganti.
	 */
	let now = $state(new Date());
	$effect(() => {
		if (!refreshMs) return;
		const timer = setInterval(() => (now = new Date()), refreshMs);
		return () => clearInterval(timer);
	});

	const timeRange = $derived.by(() => {
		const config = periodConfig(period);
		return {
			...alignTrendRange(now, config.durationMs, config.resolution),
			resolution: config.resolution
		};
	});

	const comparison = $derived.by(() => {
		if (comparisonMode === 'none') return null;
		const offsetMs = comparisonOffsetMs(comparisonMode, timeRange);
		const range = shiftRange(timeRange, offsetMs);
		const option = TREND_COMPARISONS.find((item) => item.value === comparisonMode);
		const isLastYear = comparisonMode === 'last-year';
		return {
			range,
			offsetMs,
			label: `${option?.label} (${formatRangeLabel(range, isLastYear)})`,
			currentLabel: `Periode ini (${formatRangeLabel(timeRange, isLastYear)})`
		};
	});

	async function setFilter(key: 'parameter' | 'grafik' | 'period' | 'compare', value: string) {
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
		title="Tren & Grafik"
		description={isConfigured
			? `Daftar tren PLTA ${displayName}`
			: `Pilih satu parameter untuk melihat tren data PLTA ${displayName}`}
	>
		{#snippet actions()}
			{#if canConfigure}
				<Button type="button" variant="ghost" size="sm" onclick={() => (isListSheetOpen = true)}>
					{#snippet leftIcon()}<IconSliders class="size-4" />{/snippet}
					Atur daftar tren
				</Button>
			{/if}
			<PlantSwitcher page="trends" />
		{/snippet}
	</PageHeader>

	<!--
		Periode dan pembanding dirender di toolbar tiap tampilan, sebaris dengan
		pemilih grafik — dulu dua baris kontrol terpisah, dan pemilih grafik (apa
		yang dilihat) justru di bawah pemilih periode.
	-->
	{#snippet filters()}
		<SegmentedControl
			ariaLabel="Periode tren"
			value={period}
			onChange={(value) => void setFilter('period', value)}
			options={TREND_PERIODS.map((item) => ({ value: item, label: PERIOD_LABEL[item] }))}
		/>
		<div class="w-full sm:w-48">
			<Select
				ariaLabel="Bandingkan dengan"
				value={comparisonMode}
				onValueChange={(value) => void setFilter('compare', value)}
				controlSize="sm"
				options={TREND_COMPARISONS.map((item) => ({ value: item.value, label: item.label }))}
			/>
		</div>
	{/snippet}

	{#if listQuery.isLoading}
		<div role="status" class="skeleton-shimmer h-[420px] rounded-xl">
			<span class="sr-only">Memuat daftar tren…</span>
		</div>
	{:else if isConfigured && selectedChart}
		<PlantTrendBoard
			{pltaId}
			plantCode={activePLTA.plant.code}
			range={timeRange}
			comparison={comparison
				? { range: comparison.range, offsetMs: comparison.offsetMs, label: comparison.label }
				: null}
			options={chartOptions}
			selected={selectedChart}
			{filters}
			{refreshMs}
			onChartChange={(value) => void setFilter('grafik', value)}
		/>
	{:else}
		{#if listQuery.isSuccess}
			<Banner tone="info">
				Daftar tren PLTA ini belum diatur, jadi ditampilkan grafik satu parameter.
				{canConfigure
					? 'Tekan Atur daftar tren untuk memilih metrik dan mengelompokkannya.'
					: 'Admin dapat mengatur daftar tren untuk PLTA ini.'}
			</Banner>
		{/if}
		<ParameterTrendView
			{pltaId}
			range={timeRange}
			{comparison}
			parameter={parameterParam}
			{filters}
			onParameterChange={(value) => void setFilter('parameter', value)}
		/>
	{/if}
</div>

{#if canConfigure && isListSheetOpen}
	<TrendListSheet
		isOpen
		{pltaId}
		plantName={displayName}
		onClose={() => (isListSheetOpen = false)}
	/>
{/if}
