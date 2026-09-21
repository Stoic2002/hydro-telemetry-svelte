<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import { setActivePLTAContext, type ActivePLTA } from '$features/plta/active-plta-context';
	import MonthlyPage from './+page.svelte';

	/**
	 * Pembungkus khusus test: halaman Hidrologi Bulanan membaca PLTA aktif dari
	 * context yang biasanya dipasang `+layout.svelte`, dan memanggil query yang
	 * butuh `QueryClient`.
	 */
	let { queryClient, activePLTA }: { queryClient: QueryClient; activePLTA: ActivePLTA } = $props();

	setActivePLTAContext(() => activePLTA);
</script>

<QueryClientProvider client={queryClient}>
	<MonthlyPage />
</QueryClientProvider>
