<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import type { createMonitoringStream, MonitoringStreamOptions } from './monitoring-stream.svelte';
	import MonitoringStreamProbe from './MonitoringStreamProbe.test-harness.svelte';

	interface Props {
		queryClient: QueryClient;
		options: MonitoringStreamOptions;
		onReady: (stream: ReturnType<typeof createMonitoringStream>) => void;
	}

	let { queryClient, options, onReady }: Props = $props();
</script>

<QueryClientProvider client={queryClient}>
	<MonitoringStreamProbe {options} {onReady} />
</QueryClientProvider>
