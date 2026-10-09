<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import ElevationCurveList from './ElevationCurveList.svelte';

	/** Pembungkus khusus test: daftar kurva memanggil query dan mutation. */
	let { queryClient, pltaId }: { queryClient: QueryClient; pltaId: string } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<ElevationCurveList {pltaId} plantName="PB Soedirman" year={2026} />
</QueryClientProvider>
