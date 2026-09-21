<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconWarning from '~icons/ph/warning';

	import SourceMarker from '$components/controls/SourceMarker.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canEditHydrologyData } from '$features/auth';
	import { createDailyHydrologyQuery, getHydrologyErrorMessage } from '$features/hydrology';
	import { createMonitoringStream, createPLTALatestQuery } from '$features/monitoring';
	import { createPLTATagsQuery, getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import TelemetryUploadSheet from '$features/telemetry-upload/components/TelemetryUploadSheet.svelte';
	import DmnUnitPicker from './DmnUnitPicker.svelte';
	import HydrologySpatialLayout from '../HydrologySpatialLayout.svelte';
	import {
		currentWibDate,
		dashboardMetricRows,
		formatHydrologyDate,
		latestMonitoringParameter,
		monitoringSource,
		resolveMetricUploadTargets,
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

	const uploadTagsQuery = createPLTATagsQuery(
		() => pltaId,
		() => ({ page: 1, limit: 200, protocol: 'upload', enabled: true })
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

	async function applyDmnFilter(units: number[], dmnMw: number | undefined) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);

		if (units.length > 0) params.set('units', units.join(','));
		else params.delete('units');

		if (dmnMw === undefined) params.delete('dmn');
		else params.set('dmn', String(dmnMw));

		const query = params.toString();
		await goto(query ? `?${query}` : '?', {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
	const isDailyLoading = $derived(dailyQuery.isLoading);
	const uploadTags = $derived(
		uploadTagsQuery.isPlaceholderData ? undefined : uploadTagsQuery.data?.items
	);

	// Satu tabel pemetaan untuk seluruh panel (`METRIC_UPLOAD_BINDINGS`): tombol
	// "Input data" muncul di setiap baris yang PLTA ini punya tag unggahnya.
	const metricUploadTargets = $derived(
		resolveMetricUploadTargets([daily?.upstream, daily?.dam, daily?.downstream], uploadTags ?? [])
	);

	// Legenda hanya menampilkan penanda yang benar-benar dipakai di layar.
	const hasConstantUploadTags = $derived(
		(uploadTags ?? []).some((tag) => tag.parameter.startsWith('const_') && tag.enabled)
	);

	const monitoringParameters = $derived(monitoringQuery.data?.parameters ?? []);

	function toOverride(reading: ReturnType<typeof latestMonitoringParameter>) {
		if (reading?.value === undefined) return undefined;
		return { value: reading.value, source: monitoringSource(reading) };
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
			rows: dashboardMetricRows(
				daily?.upstream,
				isDailyLoading,
				metricUploadTargets,
				{ tma_waduk: reservoirOverride },
				['target_tma', 'tma_waduk', 'inflow', 'curah_hujan', 'volume_waduk']
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
				['debit_turbin_total', 'debit_spillway', 'debit_irigasi', 'debit_ddc', 'delta_head']
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
				['tma_tailrace', 'head', 'swc_unit_1', 'turbidity_hilir', 'ph_hilir']
			)
		}
	]);
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering"
		title="Hidrologi Harian"
		description={`Kondisi hulu, bendungan, dan hilir PLTA ${displayName} hari ini`}
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

		<span class="flex items-center gap-1.5"><SourceMarker type="formula" />Formulasi</span>
		{#if (uploadTags?.length ?? 0) > 0}
			<span class="flex items-center gap-1.5"><SourceMarker type="input" />Input</span>
		{/if}
		<span class="flex items-center gap-1.5"><SourceMarker type="constant" />Konstanta</span>
		{#if hasConstantUploadTags}
			<span class="flex items-center gap-1.5">
				<SourceMarker type="constant-input" />Konstanta (input)
			</span>
		{/if}
		<span class="flex items-center gap-1.5"><SourceMarker type="unavailable" />Belum tersedia</span>

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

	{#if uploadTagsQuery.isError}
		<Banner tone="warning">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				Katalog input manual belum dapat dimuat. Data monitoring tetap tersedia.
				<button
					type="button"
					onclick={() => void uploadTagsQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
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
		Full Load, dan keluarga "thd target" — ada di zona itu.
	-->
	{#snippet dmnPicker()}
		<DmnUnitPicker
			units={dmnUnits}
			{selectedUnits}
			{manualDmn}
			isBusy={dailyQuery.isFetching}
			onChange={(units, dmn) => void applyDmnFilter(units, dmn)}
		/>
	{/snippet}

	<HydrologySpatialLayout
		{plant}
		plantName={displayName}
		{upstreamSections}
		{damSections}
		{downstreamSections}
		zoneControls={{ upstream: dmnPicker }}
		onUpload={canEditData ? (target) => (dailyUploadTarget = target) : undefined}
	/>
</div>

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
