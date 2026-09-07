<script lang="ts">
	import Consumer from './ActivePLTAContextConsumer.test-harness.svelte';
	import { setActivePLTAContext, type ActivePLTA } from './active-plta-context';

	interface Props {
		activePLTA: ActivePLTA;
	}

	let { activePLTA }: Props = $props();

	// Sama seperti `routes/dashboard/plta/[pltaId]/+layout.svelte`: yang disimpan
	// accessor, dan komponen ini tidak pernah di-remount saat PLTA berganti.
	setActivePLTAContext(() => activePLTA);
</script>

<Consumer />
