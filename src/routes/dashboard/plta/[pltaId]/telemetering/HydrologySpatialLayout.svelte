<script lang="ts">
	import { HYDROLOGY_ZONES, getDamImagery, type HydrologyZone, type Plant } from '$features/plta';
	import DamHydrologyMap from '$features/plta/components/DamHydrologyMap.svelte';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import GenericHydrologySchematic from './GenericHydrologySchematic.svelte';
	import HydrologyMetricCard from './HydrologyMetricCard.svelte';
	import type { MetricSection } from './presentation';

	interface Props {
		plant: Pick<Plant, 'code' | 'name'>;
		plantName: string;
		upstreamSections: MetricSection[];
		damSections: MetricSection[];
		downstreamSections: MetricSection[];
		onUpload: (target: DailyTelemetryUploadTarget) => void;
	}

	let { plant, plantName, upstreamSections, damSections, downstreamSections, onUpload }: Props =
		$props();

	let activeZone = $state<HydrologyZone | null>(null);
	let failedImageUrl = $state<string | null>(null);

	// Kartu diikat supaya memilih zona di peta bisa memindahkan fokus ke kartunya.
	let cardElements = $state<Record<HydrologyZone, HTMLElement | null>>({
		upstream: null,
		dam: null,
		downstream: null
	});

	const imagery = $derived(getDamImagery(plant));
	const imageLoadFailed = $derived(Boolean(imagery && failedImageUrl === imagery.imageUrl));

	const sectionsByZone = $derived<Record<HydrologyZone, MetricSection[]>>({
		upstream: upstreamSections,
		dam: damSections,
		downstream: downstreamSections
	});

	function selectZone(zone: HydrologyZone) {
		activeZone = zone;
		const card = cardElements[zone];
		card?.focus({ preventScroll: true });
		card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function changeHighlight(zone: HydrologyZone, isHighlighted: boolean) {
		if (isHighlighted) {
			activeZone = zone;
			return;
		}
		if (activeZone === zone) activeZone = null;
	}
</script>

{#snippet zoneCards()}
	{#each HYDROLOGY_ZONES as zone (zone)}
		<HydrologyMetricCard
			bind:element={cardElements[zone]}
			{zone}
			isHighlighted={activeZone === zone}
			onHighlightChange={(isHighlighted) => changeHighlight(zone, isHighlighted)}
			sections={sectionsByZone[zone]}
			{onUpload}
		/>
	{/each}
{/snippet}

{#if !imagery || imageLoadFailed}
	<!--
		Tanpa foto bendungan — atau ketika fotonya gagal dimuat — kartu berdiri
		sendiri dan skema generik yang menggantikan perannya sebagai penjelas
		urutan aliran. Inilah yang membuat fitur ini aman dirilis sebelum berkas
		fotonya ada di `static/dam/`.
	-->
	<div
		class="grid divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-raised lg:grid-cols-3 lg:divide-x lg:divide-y-0"
	>
		{@render zoneCards()}
	</div>
	<div class="mt-5">
		<GenericHydrologySchematic {plantName} />
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
		<DamHydrologyMap
			{imagery}
			{activeZone}
			onActiveZoneChange={(zone) => (activeZone = zone)}
			onImageError={() => (failedImageUrl = imagery.imageUrl)}
			onZoneSelect={selectZone}
		/>
		<div
			class="grid divide-y divide-border-subtle border-t border-border-subtle lg:grid-cols-3 lg:divide-x lg:divide-y-0"
		>
			{@render zoneCards()}
		</div>
	</div>
{/if}
