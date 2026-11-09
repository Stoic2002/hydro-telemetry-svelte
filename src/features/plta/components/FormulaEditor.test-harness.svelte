<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import FormulaEditor from './FormulaEditor.svelte';
	import { parseFormulaForm, type FormulaFormValues } from '../formula-form';

	/** Pembungkus khusus test: mutation butuh `QueryClient`, dan isian dipegang di sini. */
	let {
		queryClient,
		initial,
		onInvalidTest
	}: { queryClient: QueryClient; initial: FormulaFormValues; onInvalidTest: () => void } = $props();

	// Salinan awal sekali pakai; editor yang mengubahnya sesudah itu.
	// svelte-ignore state_referenced_locally
	let values = $state(initial);
	const parsed = $derived(parseFormulaForm(values));
</script>

<QueryClientProvider client={queryClient}>
	<FormulaEditor
		bind:values
		errors={{ rows: {} }}
		parameterOptions={[{ value: 'beban', label: 'Beban · beban' }]}
		disabled={false}
		pltaId="11111111-1111-4111-8111-111111111111"
		code="EFISIENSI"
		formula={parsed.ok ? parsed.formula : null}
		{onInvalidTest}
	/>
</QueryClientProvider>
