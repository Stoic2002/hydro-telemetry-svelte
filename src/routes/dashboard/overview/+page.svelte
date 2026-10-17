<script lang="ts">
	import { goto } from '$app/navigation';
	import JavaMap from '$components/map/JavaMap.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { createPlantCatalogQuery, getPLTADashboardPath } from '$features/plta';
	import FleetSummary from './FleetSummary.svelte';
	import FleetSummaryControls from './FleetSummaryControls.svelte';

	const OVERVIEW_MAP_PROJECTION = {
		center: [110.0, -7.35] as [number, number],
		scale: 24_000
	};

	const plantsQuery = createPlantCatalogQuery();
	const registeredPlantCount = $derived(
		plantsQuery.isSuccess ? (plantsQuery.data?.length ?? 0) : null
	);
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader title="Overview" description="Peta sebaran PLTA di Jawa Tengah">
		{#snippet actions()}
			<!-- Pemilih periode ringkasan; angka dan detailnya di kartu dasar peta. -->
			<FleetSummaryControls {registeredPlantCount} />
		{/snippet}
	</PageHeader>

	<div class="mx-auto flex w-full max-w-[1480px] min-w-0 flex-col gap-3">
		<div class="flex min-w-0 items-center justify-center overflow-hidden">
			<JavaMap
				onPLTAClick={(pltaId) => void goto(getPLTADashboardPath(pltaId, 'telemetering'))}
				projectionConfig={OVERVIEW_MAP_PROJECTION}
				showPrecipitation
			>
				{#snippet bottomOverlay()}
					<FleetSummary {registeredPlantCount} />
				{/snippet}
			</JavaMap>
		</div>
		<!-- Di layar sempit kartu melayang menutupi peta, jadi turun ke bawahnya. -->
		<div class="lg:hidden">
			<FleetSummary {registeredPlantCount} />
		</div>
	</div>
</div>
