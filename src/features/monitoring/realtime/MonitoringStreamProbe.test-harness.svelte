<script lang="ts">
	import { createMonitoringStream, type MonitoringStreamOptions } from './monitoring-stream.svelte';

	interface Props {
		options: MonitoringStreamOptions;
		onReady: (stream: ReturnType<typeof createMonitoringStream>) => void;
	}

	let { options, onReady }: Props = $props();

	// Accessor, sama seperti pemanggilan aslinya di halaman Hidrologi Harian.
	const stream = createMonitoringStream(() => options);

	// Diserahkan lewat efek, bukan langsung di badan komponen: membaca prop
	// `onReady` saat init akan memicu `state_referenced_locally`, dan peringatan
	// itu tidak boleh dinormalkan di project ini.
	$effect(() => {
		onReady(stream);
	});
</script>
