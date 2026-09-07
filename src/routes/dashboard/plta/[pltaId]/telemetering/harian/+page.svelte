<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconWarning from '~icons/ph/warning';

	import SourceMarker from '$components/atoms/SourceMarker.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { createDailyHydrologyQuery, getHydrologyErrorMessage } from '$features/hydrology';
	import { createMonitoringStream, createPLTALatestQuery } from '$features/monitoring';
	import { createPLTATagsQuery, getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import TelemetryUploadSheet from '$features/telemetry-upload/components/TelemetryUploadSheet.svelte';
	import HydrologySpatialLayout from '../HydrologySpatialLayout.svelte';
	import {
		buildUploadTarget,
		currentWibDate,
		dashboardMetricRows,
		formatHydrologyDate,
		latestMonitoringParameter,
		monitoringSource,
		type MetricSection
	} from '../presentation';

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const plant = $derived(activePLTA.plant);
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);

	let dailyUploadTarget = $state<DailyTelemetryUploadTarget | null>(null);

	const dailyQuery = createDailyHydrologyQuery(
		() => pltaId,
		() => undefined
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

	const daily = $derived(dailyQuery.data ?? null);
	const isDailyLoading = $derived(dailyQuery.isLoading);
	const uploadTags = $derived(
		uploadTagsQuery.isPlaceholderData ? undefined : uploadTagsQuery.data?.items
	);

	const uploadTargets = $derived.by(() => {
		const tags = uploadTags ?? [];

		return {
			targetTma: buildUploadTarget(
				tags,
				'plan_water_level',
				'Target tinggi muka air waduk (TMA)',
				'mdpl'
			),
			plannedTurbineDischarge: buildUploadTarget(
				tags,
				'plan_outflow_turbine',
				'Rencana debit turbin',
				'm³/detik'
			),
			plannedSpillwayDischarge: buildUploadTarget(
				tags,
				'plan_outflow_spillway',
				'Rencana debit spillway',
				'm³/detik'
			),
			plannedHjvDischarge: buildUploadTarget(
				tags,
				'plan_outflow_hjv',
				'Rencana debit HJV',
				'm³/detik'
			),
			spillwayDischarge: buildUploadTarget(tags, 'outflow_spillway', 'Debit spillway', 'm³/detik'),
			hjvDischarge: buildUploadTarget(tags, 'outflow_hjv', 'Debit HJV', 'm³/detik'),
			// Konstanta PLTA: nilainya jarang berubah, tetapi ketika berubah operator
			// harus bisa mengisinya sendiri tanpa menunggu konfigurasi server.
			tmaLimpas: buildUploadTarget(tags, 'const_tma_limpas', 'Batas TMA limpas', 'mdpl'),
			tmaMol: buildUploadTarget(tags, 'const_tma_mol', 'Batas TMA MOL', 'mdpl'),
			tmaTailrace: buildUploadTarget(tags, 'const_tma_tailrace', 'TMA tailrace', 'mdpl'),
			tmaHilirMaks: buildUploadTarget(
				tags,
				'const_tma_hilir_maks',
				'Batas maksimal TMA hilir',
				'mdpl'
			),
			swcAcuan: buildUploadTarget(tags, 'const_swc', 'SWC acuan (papan nama)', 'm³/kWh')
		};
	});

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
				{
					target_tma: uploadTargets.targetTma,
					batas_tma_limpas: uploadTargets.tmaLimpas,
					batas_tma_mol: uploadTargets.tmaMol
				},
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
				{
					rencana_debit_turbin_unit_1: uploadTargets.plannedTurbineDischarge,
					rencana_debit_turbin_unit_2: uploadTargets.plannedTurbineDischarge,
					rencana_debit_turbin_unit_3: uploadTargets.plannedTurbineDischarge,
					rencana_debit_turbin_unit_4: uploadTargets.plannedTurbineDischarge,
					rencana_debit_spillway: uploadTargets.plannedSpillwayDischarge,
					rencana_debit_hjv: uploadTargets.plannedHjvDischarge,
					debit_spillway: uploadTargets.spillwayDischarge,
					debit_hjv: uploadTargets.hjvDischarge
				},
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
				{
					tma_tailrace: uploadTargets.tmaTailrace,
					batas_tma_hilir_maks: uploadTargets.tmaHilirMaks,
					swc_acuan: uploadTargets.swcAcuan
				},
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

	<HydrologySpatialLayout
		{plant}
		plantName={displayName}
		{upstreamSections}
		{damSections}
		{downstreamSections}
		onUpload={(target) => (dailyUploadTarget = target)}
	/>
</div>

{#if dailyUploadTarget}
	<TelemetryUploadSheet
		isOpen
		{pltaId}
		plantName={displayName}
		defaultDate={daily?.date ?? currentWibDate()}
		target={dailyUploadTarget}
		onClose={() => (dailyUploadTarget = null)}
	/>
{/if}
