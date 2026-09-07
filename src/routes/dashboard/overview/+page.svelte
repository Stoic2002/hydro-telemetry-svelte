<script lang="ts">
	import { goto } from '$app/navigation';
	import JavaMap from '$components/map/JavaMap.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { createPlantCatalogQuery, getPLTADashboardPath } from '$features/plta';

	const OVERVIEW_MAP_PROJECTION = {
		center: [110.0, -7.35] as [number, number],
		scale: 24_000
	};

	const plantsQuery = createPlantCatalogQuery();
	const activePlantCount = $derived(
		(plantsQuery.data ?? []).filter((plant) => plant.isActive).length
	);
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Overview"
		description="Peta sebaran PLTA di Jawa Tengah beserta kapasitas energinya"
	>
		{#snippet actions()}
			<span class="flex items-center gap-1.5">
				<span class="relative flex size-2">
					<span class="absolute inset-0 rounded-full bg-status-success-strong"></span>
					<span class="absolute inset-0 animate-ping rounded-full bg-status-success-strong"></span>
				</span>
				<span class="text-xs text-text-secondary">Data diperbarui otomatis</span>
			</span>
			{#if plantsQuery.isSuccess}
				<span class="h-3.5 w-px bg-border-subtle"></span>
				<span class="font-mono text-xs font-medium text-text-muted">
					{activePlantCount} PLTA aktif
				</span>
			{/if}
		{/snippet}
	</PageHeader>

	<div
		class="mx-auto flex w-full max-w-[1480px] min-w-0 items-center justify-center overflow-hidden"
	>
		<JavaMap
			onPLTAClick={(pltaId) => void goto(getPLTADashboardPath(pltaId, 'telemetering'))}
			projectionConfig={OVERVIEW_MAP_PROJECTION}
			showPrecipitation
		/>
	</div>
</div>
