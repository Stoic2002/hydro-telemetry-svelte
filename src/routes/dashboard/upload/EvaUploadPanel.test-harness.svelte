<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { Plant } from '$features/plta';
	import EvaUploadPanel from './EvaUploadPanel.svelte';

	/**
	 * Pembungkus khusus test: panel memanggil mutation yang butuh `QueryClient`,
	 * dan `plant` perlu bisa diganti dari test untuk meniru operator berpindah
	 * PLTA setelah memilih berkas.
	 */
	let {
		queryClient,
		plant,
		plants,
		onPlantChange = () => {}
	}: {
		queryClient: QueryClient;
		plant: Plant;
		plants: Plant[];
		onPlantChange?: (pltaId: string) => void;
	} = $props();
</script>

<QueryClientProvider client={queryClient}>
	<EvaUploadPanel {plant} {plants} {onPlantChange} />
</QueryClientProvider>
