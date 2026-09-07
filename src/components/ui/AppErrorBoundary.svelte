<script lang="ts" module>
	export interface ErrorDescription {
		title: string;
		/** Kalimat non-teknis untuk operator. Jangan masukkan pesan mentah server. */
		description: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import ErrorState from './ErrorState.svelte';
	import { reportError } from '../../shared/lib/report-error';

	interface Props {
		children: Snippet;
		/** Asal kejadian yang ikut dilaporkan, mis. 'dashboard-page'. */
		scope: string;
		/**
		 * Saat nilainya berubah, boundary pulih sendiri. Diisi dengan pathname supaya
		 * operator bisa keluar dari halaman rusak lewat sidebar tanpa reload.
		 */
		resetKey?: string;
		/** Mengenali error yang punya penjelasan khusus, mis. PLTA tidak tersedia. */
		describeError?: (error: unknown) => ErrorDescription | null;
		onReset?: () => void;
		class?: string;
	}

	/**
	 * Padanan React error boundary. Di Svelte perannya diisi `<svelte:boundary>`,
	 * jadi tidak perlu kelas komponen seperti di versi React — tapi API-nya
	 * dipertahankan supaya pemakaian di halaman tidak berubah.
	 */
	let {
		children,
		scope,
		resetKey,
		describeError,
		onReset,
		class: className = ''
	}: Props = $props();

	const FALLBACK_DESCRIPTION: ErrorDescription = {
		title: 'Halaman ini gagal ditampilkan',
		description:
			'Terjadi gangguan saat menyiapkan tampilan. Coba muat ulang bagian ini, atau pilih menu lain di sidebar.'
	};

	let caughtError = $state<unknown>(null);

	/**
	 * Berpindah halaman lewat sidebar memulihkan boundary tanpa reload.
	 *
	 * Pembanding sengaja `let` biasa, bukan `$state`: nilainya hanya dipakai untuk
	 * mendeteksi pergantian `resetKey` di dalam efek ini dan tidak boleh ikut
	 * memicu efek lain.
	 */
	let lastResetKey: string | undefined = undefined;

	$effect(() => {
		if (lastResetKey !== resetKey) {
			lastResetKey = resetKey;
			caughtError = null;
		}
	});

	const description = $derived(
		caughtError === null ? null : (describeError?.(caughtError) ?? FALLBACK_DESCRIPTION)
	);

	function handleError(error: unknown) {
		caughtError = error;
		reportError(error, { scope, severity: 'fatal' });
	}

	function handleReset() {
		caughtError = null;
		onReset?.();
	}
</script>

{#if description}
	<div class={`rounded-xl border border-border-subtle bg-surface-raised ${className}`}>
		<ErrorState
			title={description.title}
			description={description.description}
			onRetry={handleReset}
			class="py-10"
		/>
	</div>
{:else}
	<svelte:boundary onerror={handleError}>
		{@render children()}
	</svelte:boundary>
{/if}
