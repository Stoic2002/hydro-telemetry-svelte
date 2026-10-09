<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { PlantTag } from '../model';
	import TagBoundsSheet from './TagBoundsSheet.svelte';

	/** Pembungkus khusus test: sheet memakai mutation yang butuh `QueryClient`. */
	let {
		queryClient,
		tag,
		onClose = () => {}
	}: { queryClient: QueryClient; tag: PlantTag; onClose?: () => void } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<TagBoundsSheet isOpen {tag} {onClose} />
</QueryClientProvider>
