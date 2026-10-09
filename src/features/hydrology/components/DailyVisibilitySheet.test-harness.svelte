<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { DailyReportPanel } from '../model';
	import DailyVisibilitySheet from './DailyVisibilitySheet.svelte';

	/**
	 * Pembungkus khusus test: sheet memanggil query dan mutation yang butuh
	 * `QueryClient` di context.
	 */
	let {
		queryClient,
		pltaId,
		panel = 'hulu',
		onClose = () => {}
	}: {
		queryClient: QueryClient;
		pltaId: string;
		panel?: DailyReportPanel;
		onClose?: () => void;
	} = $props();
</script>

<QueryClientProvider client={queryClient}>
	<DailyVisibilitySheet isOpen {pltaId} {panel} plantName="Soedirman" {onClose} />
</QueryClientProvider>
