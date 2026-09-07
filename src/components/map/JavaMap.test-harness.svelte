<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import JavaMap from './JavaMap.svelte';

	/**
	 * Pembungkus khusus test. `JavaMap` memanggil factory query yang butuh
	 * `QueryClient` di context; testing-library tidak menyediakan cara memasang
	 * provider selain lewat komponen pembungkus seperti ini.
	 */
	let {
		queryClient,
		onPLTAClick
	}: { queryClient: QueryClient; onPLTAClick: (pltaId: string) => void } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<JavaMap {onPLTAClick} />
</QueryClientProvider>
