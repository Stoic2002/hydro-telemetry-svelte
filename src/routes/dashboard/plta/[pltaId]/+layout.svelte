<script lang="ts">
	import { setActivePLTAContext } from '../../../../features/plta';

	let { data, children } = $props();

	// Accessor, bukan nilai jadi: berpindah PLTA lewat sidebar mengganti isi
	// `data` tanpa melepas layout ini, jadi turunan harus membaca nilai terbaru.
	setActivePLTAContext(() => data.activePLTA);
</script>

{@render children()}
