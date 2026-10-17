<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import TelemetryUploadSheet from './TelemetryUploadSheet.svelte';
	import type { DailyTelemetryUploadTarget } from '../model';

	/**
	 * Pembungkus khusus test: panel ini memanggil mutation yang butuh
	 * `QueryClient` di context.
	 */
	let {
		queryClient,
		target,
		defaultDate = '2026-10-15',
		onClose = () => {}
	}: {
		queryClient: QueryClient;
		target: DailyTelemetryUploadTarget;
		defaultDate?: string;
		onClose?: () => void;
	} = $props();
</script>

<QueryClientProvider client={queryClient}>
	<TelemetryUploadSheet
		isOpen
		pltaId="11111111-1111-4111-8111-111111111111"
		plantName="Soedirman"
		{defaultDate}
		{target}
		{onClose}
	/>
</QueryClientProvider>
