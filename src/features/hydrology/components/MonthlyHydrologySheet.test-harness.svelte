<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import MonthlyHydrologySheet from './MonthlyHydrologySheet.svelte';
	import type { MonthlyHydrology } from '../model';

	/**
	 * Pembungkus khusus test: panel ini memakai mutation yang butuh `QueryClient`
	 * di context. Galat render ditangkap boundary lalu diteruskan ke `onError`,
	 * karena tanpa boundary galat efek tidak sampai ke test sebagai kegagalan.
	 */
	let {
		queryClient,
		record,
		onError
	}: {
		queryClient: QueryClient;
		record?: MonthlyHydrology;
		onError: (error: unknown) => void;
	} = $props();
</script>

<svelte:boundary onerror={onError}>
	<QueryClientProvider client={queryClient}>
		<MonthlyHydrologySheet
			isOpen
			pltaId="plta-1"
			plantName="PB Soedirman (Mrica)"
			year={2026}
			month={9}
			monthLabel="September"
			{record}
			onClose={() => {}}
		/>
	</QueryClientProvider>
</svelte:boundary>
