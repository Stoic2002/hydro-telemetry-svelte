<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import TimeseriesQuickDownload from './TimeseriesQuickDownload.svelte';

	/** Pembungkus khusus test: query dan mutation butuh `QueryClient` di context. */
	let { queryClient }: { queryClient: QueryClient } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<TimeseriesQuickDownload
		pltaId="11111111-1111-4111-8111-111111111111"
		plantCode="PBS"
		plantName="Soedirman"
	/>
</QueryClientProvider>
