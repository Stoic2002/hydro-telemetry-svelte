<script lang="ts">
	import './layout.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$core/query-client';
	import { installErrorReporting } from '$core/error-reporting';
	import { authStore } from '../features/auth';
	import AppErrorBoundary from '../components/ui/AppErrorBoundary.svelte';
	import Toast from '../components/ui/Toast.svelte';

	let { children } = $props();

	/**
	 * Composition root. Padanan `AppProviders` + `App` di versi React, tapi tanpa
	 * komponen pembungkus tersendiri: SvelteKit sudah menyediakan satu layout
	 * root, jadi pemasangannya cukup di sini.
	 *
	 * Pelaporan error dipasang sebelum apa pun yang lain supaya kegagalan saat
	 * memulihkan sesi ikut tercatat.
	 */
	installErrorReporting();

	$effect(() => {
		// Penanda cat pertama di `app.html` sudah tidak diperlukan begitu aplikasi
		// terpasang. Dihapus, bukan disembunyikan, supaya tidak ikut terbaca
		// pembaca layar sebagai status pemuatan yang tidak pernah selesai.
		document.getElementById('boot-shimmer')?.remove();
	});

	// Sesi habis atau logout dari tab lain: cache server tidak boleh tertinggal
	// dan terbaca oleh pengguna berikutnya di perangkat yang sama.
	$effect(() => {
		if (authStore.isInitialized && !authStore.isAuthenticated) {
			queryClient.clear();
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Toast />

	<!-- Jaring terakhir: menangkap kegagalan di luar shell dashboard, mis. Login. -->
	<AppErrorBoundary scope="app-root" class="m-6">
		{@render children()}
	</AppErrorBoundary>
</QueryClientProvider>
