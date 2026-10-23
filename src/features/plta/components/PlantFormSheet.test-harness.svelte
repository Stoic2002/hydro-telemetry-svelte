<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { Plant, RiverBasin } from '../model';
	import PlantFormSheet from './PlantFormSheet.svelte';

	/** Pembungkus khusus test: mutation butuh `QueryClient` di context. */
	let {
		queryClient,
		plant,
		riverBasins,
		onClose = () => {}
	}: {
		queryClient: QueryClient;
		plant: Plant | null;
		riverBasins: RiverBasin[];
		onClose?: () => void;
	} = $props();
</script>

<QueryClientProvider client={queryClient}>
	<PlantFormSheet isOpen {plant} {riverBasins} {onClose} />
</QueryClientProvider>
