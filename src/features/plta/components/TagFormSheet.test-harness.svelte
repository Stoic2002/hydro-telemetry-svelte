<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import TagFormSheet from './TagFormSheet.svelte';

	/** Pembungkus khusus test: mutation butuh `QueryClient` di context. */
	let { queryClient }: { queryClient: QueryClient } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<TagFormSheet
		isOpen
		pltaId="11111111-1111-4111-8111-111111111111"
		plantName="Soedirman"
		onClose={() => {}}
	/>
</QueryClientProvider>
