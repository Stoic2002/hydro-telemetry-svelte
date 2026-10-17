<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconClock from '~icons/ph/clock';
	import IconSliders from '~icons/ph/sliders-horizontal';
	import IconWarning from '~icons/ph/warning';

	import SourceMarker, {
		DAILY_SOURCE_TYPES,
		SOURCE_MARKER_LABEL
	} from '$components/controls/SourceMarker.svelte';
	import SegmentedControl from '$components/controls/SegmentedControl.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canConfigureDisplay, canEditHydrologyData } from '$features/auth';
	import {
		createDailyHydrologyQuery,
		getHydrologyErrorMessage,
		type DailyReportPanel
	} from '$features/hydrology';
	import DailyVisibilitySheet from '$features/hydrology/components/DailyVisibilitySheet.svelte';
	import { createMonitoringStream, createPLTALatestQuery } from '$features/monitoring';
	import { HYDROLOGY_ZONE_PRESENTATION, getActivePLTA, type HydrologyZone } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import TelemetryUploadSheet from '$features/telemetry-upload/components/TelemetryUploadSheet.svelte';
	import DmnUnitPicker from './DmnUnitPicker.svelte';
	import HydrologySpatialLayout from '../HydrologySpatialLayout.svelte';
	import {
		DAILY_ROW_FILTERS,
		DAILY_ROW_FILTER_EMPTY_MESSAGE,
		DAILY_ZONE_FILTERS,
		currentWibDate,
		dashboardMetricRows,
		filterMetricRows,
		parseDailyRowFilter,
		parseDailyZoneFilter,
		type DailyRowFilter,
		type DailyZoneFilter,
		formatHydrologyDate,
		latestMonitoringParameter,
		markRecalculating,
		monitoringSource,
		resolveMetricUploadTargets,
		staleMetricRows,
		type MetricSection
	} from '../presentation';

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());

	// Viewer hanya membaca; tombol "Input data" dan form isiannya tidak dirender.
	const canEditData = $derived(canEditHydrologyData(authStore.user));
	const plant = $derived(activePLTA.plant);
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);

	let dailyUploadTarget = $state<DailyTelemetryUploadTarget | null>(null);
	/** Panel yang tata letaknya sedang diatur; `null` = sheet tertutup. */
	let layoutPanel = $state<DailyReportPanel | null>(null);

	// Satu sheet per panel, dibuka dari ikon di sebelah judul kartunya: operator
	// mengatur panel yang sedang dilihatnya, bukan mencari di daftar 69 metrik.
	const ZONE_PANEL: Record<HydrologyZone, DailyReportPanel> = {
		upstream: 'hulu',
		dam: 'dam',
		downstream: 'hilir'
	};

	/**
	 * Penyebut DMN disimpan di query string, bukan state komponen: operator
	 * sering membagikan tautan ke kondisi tertentu, dan tombol Kembali harus
	 * mengembalikan pilihan sebelumnya — sama seperti filter di Tren & Grafik.
	 */
	const selectedUnits = $derived.by(() => {
		const raw = page.url.searchParams.get('units');
		if (!raw) return [];

		return raw
			.split(',')
			.map((value: string) => Number(value.trim()))
			.filter((value: number) => Number.isInteger(value) && value > 0);
	});

	const manualDmn = $derived.by(() => {
		const raw = Number(page.url.searchParams.get('dmn'));
		return Number.isFinite(raw) && raw > 0 ? raw : undefined;
	});

	const dailyQuery = createDailyHydrologyQuery(
		() => pltaId,
		() => ({ units: selectedUnits, dmnMw: manualDmn })
	);

	// Bootstrap dimatikan di kedua tempat: snapshot awal tidak diperlukan karena
	// nilai dasarnya sudah datang dari endpoint hidrologi harian, dan realtime
	// hanya menimpa parameter yang benar-benar dikirim.
	const monitoringQuery = createPLTALatestQuery(
		() => pltaId,
		() => false
	);
	const monitoringStream = createMonitoringStream(() => ({
		scope: 'plta',
		id: pltaId,
		bootstrapLatest: false
	}));

	const daily = $derived(dailyQuery.data?.daily ?? null);
	const dmnUnits = $derived(dailyQuery.data?.dmnUnits ?? []);

	/**
	 * Semua perubahan query string halaman ini lewat satu `goto`: dua `goto`
	 * berturut-turut sama-sama membaca URL lama dan yang kedua membatalkan yang
	 * pertama. Nilai kosong menghapus parameternya.
	 */
	async function setSearchParams(changes: Record<string, string | undefined>) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}

		const query = params.toString();
		await goto(query ? `?${query}` : '?', {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function applyDmnFilter(units: number[], dmnMw: number | undefined) {
		return setSearchParams({
			units: units.length > 0 ? units.join(',') : undefined,
			dmn: dmnMw === undefined ? undefined : String(dmnMw)
		});
	}

	/**
	 * Mode tampilan: zona mana yang tampil (`?zona=`) dan baris mana di dalamnya
	 * (`?baris=`). Nilai bawaan tidak ditulis ke URL. Viewer tidak mengisi data,
	 * jadi mode Isian manual tidak ditawarkan kepadanya.
	 */
	const zoneFilter = $derived(parseDailyZoneFilter(page.url.searchParams.get('zona')));
	const rowFilterOptions = $derived(
		canEditData
			? DAILY_ROW_FILTERS
			: DAILY_ROW_FILTERS.filter((option) => option.value !== 'manual')
	);
	const rowFilter = $derived.by(() => {
		const parsed = parseDailyRowFilter(page.url.searchParams.get('baris'));
		return rowFilterOptions.some((option) => option.value === parsed) ? parsed : 'semua';
	});

	const ZONE_FILTER_ZONES: Record<DailyZoneFilter, readonly HydrologyZone[]> = {
		semua: ['upstream', 'dam', 'downstream'],
		hulu: ['upstream'],
		bendungan: ['dam'],
		hilir: ['downstream']
	};

	function setZoneFilter(value: DailyZoneFilter) {
		void setSearchParams({ zona: value === 'semua' ? undefined : value });
	}

	function setRowFilter(value: DailyRowFilter) {
		void setSearchParams({ baris: value === 'semua' ? undefined : value });
	}

	const pendingFormulaKeys = $derived(new Set(daily?.pendingFormulas ?? []));

	function applyRowFilter(sections: MetricSection[]): MetricSection[] {
		return sections.map((section) => ({
			...section,
			rows: filterMetricRows(section.rows, rowFilter, pendingFormulaKeys)
		}));
	}
	const isDailyLoading = $derived(dailyQuery.isLoading);
	/**
	 * Penyebut DMN baru sedang diminta; panel lama dipertahankan sebagai
	 * placeholder, dan hanya nilai yang bergantung pada DMN yang di-shimmer.
	 */
	const isDmnRecalculating = $derived(dailyQuery.isPlaceholderData && dailyQuery.isFetching);
	// Tombol "Input data" mengikuti field `input` yang dikirim server per metrik
	// (dan per stasiun) — bukan daftar tag maupun `source`. Lihat
	// `resolveMetricUploadTargets`.
	const metricUploadTargets = $derived(
		resolveMetricUploadTargets([daily?.upstream, daily?.dam, daily?.downstream])
	);

	const monitoringParameters = $derived(monitoringQuery.data?.parameters ?? []);

	/**
	 * Jam untuk umur pembacaan sensor. Berdetak per menit supaya badge "32 mnt
	 * lalu" ikut bertambah tanpa menunggu data baru — justru saat sensor diam,
	 * tidak ada data baru yang memicu render ulang.
	 */
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(timer);
	});

	function toOverride(reading: ReturnType<typeof latestMonitoringParameter>) {
		if (reading?.value === undefined) return undefined;
		return { value: reading.value, source: monitoringSource(reading), time: reading.time };
	}

	const reservoirOverride = $derived(
		toOverride(latestMonitoringParameter(monitoringParameters, 'reservoir', [], true))
	);
	const tailraceOverride = $derived(
		toOverride(
			latestMonitoringParameter(monitoringParameters, 'water_level', [
				'tailrace',
				'trailrace',
				'hilir',
				'downstream'
			])
		)
	);
	const turbineDischargeOverride = $derived(
		toOverride(
			latestMonitoringParameter(
				monitoringParameters,
				'total_outflow',
				['turbin', 'turbine', 'powerhouse', 'unit'],
				true
			)
		)
	);

	const upstreamSections = $derived<MetricSection[]>([
		{
			title: 'Parameter hulu',
			rows: markRecalculating(
				dashboardMetricRows(
					daily?.upstream,
					isDailyLoading,
					metricUploadTargets,
					{ tma_waduk: reservoirOverride },
					['target_tma', 'tma_waduk', 'inflow', 'curah_hujan', 'volume_waduk'],
					now
				),
				isDmnRecalculating
			)
		}
	]);

	const damSections = $derived<MetricSection[]>([
		{
			title: 'Parameter bendungan dan pelepasan',
			rows: dashboardMetricRows(
				daily?.dam,
				isDailyLoading,
				metricUploadTargets,
				{ debit_turbin_total: turbineDischargeOverride },
				['debit_turbin_total', 'debit_spillway', 'debit_irigasi', 'debit_ddc', 'delta_head'],
				now
			)
		}
	]);

	const downstreamSections = $derived<MetricSection[]>([
		{
			title: 'Parameter hilir',
			rows: dashboardMetricRows(
				daily?.downstream,
				isDailyLoading,
				metricUploadTargets,
				{ tma_tailrace: tailraceOverride },
				['tma_tailrace', 'head', 'swc_unit_1', 'turbidity_hilir', 'ph_hilir'],
				now
			)
		}
	]);

	const staleRows = $derived(
		staleMetricRows([...upstreamSections, ...damSections, ...downstreamSections])
	);

	/**
	 * Banner sensor basi bisa ditutup — operator sudah tahu, dan badge merah di
	 * tiap baris tetap tampil. Yang diingat adalah DAFTAR sensornya, per PLTA:
	 * begitu ada sensor lain yang ikut berhenti (atau yang lama pulih), banner
	 * muncul lagi. Disimpan di sessionStorage, jadi tab baru menampilkannya
	 * kembali.
	 */
	const STALE_DISMISS_KEY = 'hidrologi-harian:sensor-basi-ditutup';
	const staleSignature = $derived(
		staleRows
			.map((row) => row.key)
			.sort()
			.join(',')
	);
	let dismissedStale = $state<Record<string, string>>(readDismissedStale());
	const isStaleBannerVisible = $derived(
		staleRows.length > 0 && dismissedStale[pltaId] !== staleSignature
	);

	function readDismissedStale(): Record<string, string> {
		try {
			const raw = sessionStorage.getItem(STALE_DISMISS_KEY);
			const parsed: unknown = raw ? JSON.parse(raw) : {};
			return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
		} catch {
			return {};
		}
	}

	function dismissStaleBanner() {
		dismissedStale = { ...dismissedStale, [pltaId]: staleSignature };
		try {
			sessionStorage.setItem(STALE_DISMISS_KEY, JSON.stringify(dismissedStale));
		} catch {
			// Penyimpanan diblokir: banner tetap tertutup sampai halaman dimuat ulang.
		}
	}

	function scrollToMetric(key: string | undefined) {
		if (!key) return;
		document
			.getElementById(`metric-${key}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering · Hidrologi Harian"
		title={displayName}
		description="Kondisi hulu, bendungan, dan hilir hari ini"
	>
		{#snippet actions()}
			{#if daily}
				<span class="text-xs text-text-muted">{formatHydrologyDate(daily.date)}</span>
			{/if}
			<PlantSwitcher page="telemetering/harian" />
		{/snippet}
	</PageHeader>

	<div
		class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium tracking-wide text-text-muted uppercase"
	>
		<span class="flex items-center gap-1.5">
			<span
				class={`size-2 rounded-full ${
					monitoringStream.status === 'open'
						? 'bg-status-success-strong'
						: 'bg-status-warning-strong'
				}`}
			></span>
			{monitoringStream.status === 'open' ? 'Realtime aktif' : 'Realtime belum aktif'}
		</span>

		<!-- Empat klasifikasi sumber; sama dengan penanda di setiap baris. -->
		{#each DAILY_SOURCE_TYPES as type (type)}
			<span class="flex items-center gap-1.5"
				><SourceMarker {type} />{SOURCE_MARKER_LABEL[type]}</span
			>
		{/each}

		{#if monitoringStream.status === 'error' || monitoringStream.status === 'closed'}
			<button
				type="button"
				onclick={monitoringStream.reconnect}
				class="inline-flex cursor-pointer items-center gap-1 text-status-danger-strong"
			>
				<IconRefresh class="size-3" />
				Hubungkan ulang
			</button>
		{/if}
	</div>

	{#if dailyQuery.isError}
		<Banner tone="warning" title="Sebagian data harian belum lengkap">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getHydrologyErrorMessage(dailyQuery.error)}
				<button
					type="button"
					onclick={() => void dailyQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{/if}

	{#if isStaleBannerVisible}
		<Banner
			tone="danger"
			title={`${staleRows.length} sensor tidak diperbarui`}
			onDismiss={dismissStaleBanner}
			dismissLabel="Tutup peringatan sensor"
		>
			<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
				Angka di baris ini adalah pembacaan terakhir, bukan kondisi saat ini:
				{#each staleRows as row (row.key)}
					<button
						type="button"
						onclick={() => scrollToMetric(row.key)}
						class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
					>
						{row.label} · {row.freshness?.ageLabel}
					</button>
				{/each}
			</span>
			{#snippet icon()}<IconClock class="size-3" />{/snippet}
		</Banner>
	{/if}

	{#if daily && daily.pendingFormulas.length > 0}
		<Banner tone="warning">
			{daily.pendingFormulas.length} formula masih menunggu data: {daily.pendingFormulas.join(', ')}
			{#snippet icon()}<IconWarning class="size-3" />{/snippet}
		</Banner>
	{/if}

	<!--
		Pemilih penyebut DMN menempel pada zona Hulu, bukan di kartu tersendiri di
		atas: seluruh metrik yang dipengaruhinya — DMN Beban Penuh, Service Hour
		Full Load, dan keluarga "thd target" — ada di zona itu. Letaknya tepat di
		bawah baris Service Hour Full Load (7 Okt 2026), atau di bawah judul Hulu
		bila baris itu sedang tidak tampil.
	-->
	{#snippet layoutAction(zone: HydrologyZone)}
		{@const title = HYDROLOGY_ZONE_PRESENTATION[zone].title}
		<button
			type="button"
			onclick={() => (layoutPanel = ZONE_PANEL[zone])}
			aria-label={`Atur tampilan ${title}`}
			title={`Atur tampilan ${title}`}
			class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-brand-primary-strong"
		>
			<IconSliders class="size-4" aria-hidden="true" />
		</button>
	{/snippet}

	{#snippet dmnPicker()}
		<DmnUnitPicker
			units={dmnUnits}
			{selectedUnits}
			{manualDmn}
			isBusy={dailyQuery.isFetching}
			onChange={(units, dmn) => void applyDmnFilter(units, dmn)}
		/>
	{/snippet}

	<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
		<div class="flex max-w-full items-center gap-2 overflow-x-auto">
			<span class="text-xs font-medium text-text-muted">Zona</span>
			<SegmentedControl
				ariaLabel="Zona yang ditampilkan"
				value={zoneFilter}
				onChange={setZoneFilter}
				options={DAILY_ZONE_FILTERS}
			/>
		</div>
		<div class="flex max-w-full items-center gap-2 overflow-x-auto">
			<span class="text-xs font-medium text-text-muted">Baris</span>
			<SegmentedControl
				ariaLabel="Baris yang ditampilkan"
				value={rowFilter}
				onChange={setRowFilter}
				options={rowFilterOptions}
			/>
		</div>
	</div>

	<HydrologySpatialLayout
		{plant}
		plantName={displayName}
		upstreamSections={applyRowFilter(upstreamSections)}
		damSections={applyRowFilter(damSections)}
		downstreamSections={applyRowFilter(downstreamSections)}
		zones={ZONE_FILTER_ZONES[zoneFilter]}
		isFiltered={rowFilter !== 'semua'}
		emptyMessage={rowFilter === 'semua' ? undefined : DAILY_ROW_FILTER_EMPTY_MESSAGE[rowFilter]}
		zoneControls={{ upstream: dmnPicker }}
		zoneControlAfterKeys={{ upstream: 'service_hour_full_load' }}
		zoneAction={canEditData ? layoutAction : undefined}
		onUpload={canEditData ? (target) => (dailyUploadTarget = target) : undefined}
	/>
</div>

{#if canEditData && layoutPanel}
	<DailyVisibilitySheet
		isOpen
		{pltaId}
		panel={layoutPanel}
		plantName={displayName}
		canRename={canConfigureDisplay(authStore.user)}
		onClose={() => (layoutPanel = null)}
	/>
{/if}

{#if canEditData && dailyUploadTarget}
	<TelemetryUploadSheet
		isOpen
		{pltaId}
		plantName={displayName}
		defaultDate={daily?.date ?? currentWibDate()}
		target={dailyUploadTarget}
		onClose={() => (dailyUploadTarget = null)}
	/>
{/if}
