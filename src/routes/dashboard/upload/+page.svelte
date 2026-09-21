<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import Badge from '$components/controls/Badge.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import Tabs from '$components/ui/Tabs.svelte';
	import {
		createPlantCatalogQuery,
		getEvaUploadPath,
		getPLTAErrorMessage,
		getUploadPath
	} from '$features/plta';
	import { UPLOAD_TABS, parseUploadTab, resolveEvaPlant, uploadTabMeta } from './model';
	import EvaUploadPanel from './EvaUploadPanel.svelte';
	import DailyExcelUploadPanel from './DailyExcelUploadPanel.svelte';
	import MonthlyExcelUploadPanel from './MonthlyExcelUploadPanel.svelte';
	import MonthlyImageUploadPanel from './MonthlyImageUploadPanel.svelte';

	const activeTab = $derived(parseUploadTab(page.url.searchParams.get('tab')));
	const activeTabMeta = $derived(uploadTabMeta(activeTab));

	const plantsQuery = createPlantCatalogQuery(() => activeTab === 'eva');
	const plants = $derived(plantsQuery.data ?? []);

	const evaPlant = $derived(resolveEvaPlant(plants, page.url.searchParams.get('plta')));

	function navigate(path: string) {
		void goto(path, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader title="Upload" description={activeTabMeta.description}>
		{#snippet actions()}
			{#if activeTab === 'eva'}
				<Badge tone="slate">Per PLTA</Badge>
			{:else}
				<Badge tone="cyan">Berlaku untuk semua PLTA</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<Tabs
		idPrefix="upload"
		ariaLabel="Jenis unggahan"
		items={UPLOAD_TABS}
		activeValue={activeTab}
		onChange={(tab) => navigate(getUploadPath(tab))}
	/>

	<div
		id={`upload-panel-${activeTab}`}
		role="tabpanel"
		aria-labelledby={`upload-tab-${activeTab}`}
		tabindex="0"
		class="flex flex-col gap-6 outline-none"
	>
		{#if activeTab === 'excel'}
			<MonthlyExcelUploadPanel />
		{:else if activeTab === 'harian'}
			<DailyExcelUploadPanel />
		{:else if activeTab === 'prakiraan'}
			<MonthlyImageUploadPanel />
		{:else if plantsQuery.isPending}
			<p class="loading-text py-4" role="status">Memuat daftar PLTA…</p>
		{:else if plantsQuery.isError}
			<ErrorState
				title="Daftar PLTA belum bisa dimuat"
				description={getPLTAErrorMessage(plantsQuery.error)}
				onRetry={() => void plantsQuery.refetch()}
			/>
		{:else if evaPlant}
			<EvaUploadPanel
				plant={evaPlant}
				{plants}
				onPlantChange={(pltaId) => navigate(getEvaUploadPath(pltaId))}
			/>
		{:else}
			<EmptyState
				title="Belum ada PLTA"
				description="Kurva EVA baru bisa diunggah setelah ada PLTA yang terdaftar."
			/>
		{/if}
	</div>
</div>
