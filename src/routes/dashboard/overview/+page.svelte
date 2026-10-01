<script lang="ts">
	import { goto } from '$app/navigation';
	import JavaMap from '$components/map/JavaMap.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { createPlantCatalogQuery, getPLTADashboardPath } from '$features/plta';
	import FleetSummary from './FleetSummary.svelte';

	const OVERVIEW_MAP_PROJECTION = {
		center: [110.0, -7.35] as [number, number],
		scale: 24_000
	};

	const plantsQuery = createPlantCatalogQuery();
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader title="Overview" description="Peta sebaran PLTA di Jawa Tengah">
		{#snippet actions()}
			<!--
				Ringkasan armada (dulu di Telemetering › Rekap Hidrologi) menempati
				ruang mendatar yang kosong di kanan judul, bukan kolom di samping peta:
				kolom itu mengecilkan gambar peta 15–20%. Di bawah `xl` kepala halaman
				menumpuk, jadi ringkasannya turun ke bawah judul.
			-->
			<div class="w-full xl:w-auto">
				<FleetSummary
					registeredPlantCount={plantsQuery.isSuccess ? (plantsQuery.data?.length ?? 0) : null}
				/>
			</div>
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
