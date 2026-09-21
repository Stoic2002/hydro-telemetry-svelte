<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import HydrologyImageDeleteSheet from './HydrologyImageDeleteSheet.svelte';
	import type { MonthlyHydrologyImageKind } from '../model';

	/**
	 * Pembungkus khusus test: panel ini memanggil query dan mutation yang butuh
	 * `QueryClient` di context.
	 */
	let {
		queryClient,
		kind = 'curah_hujan',
		onClose = () => {}
	}: {
		queryClient: QueryClient;
		kind?: MonthlyHydrologyImageKind;
		onClose?: () => void;
	} = $props();
</script>

<QueryClientProvider client={queryClient}>
	<HydrologyImageDeleteSheet isOpen {kind} {onClose} />
</QueryClientProvider>
