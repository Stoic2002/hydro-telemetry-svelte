<script lang="ts">
	import { page } from '$app/state';

	/**
	 * Galat yang tidak tertangkap rute mana pun, terutama alamat yang tidak
	 * dikenal (mis. bookmark lama atau salah ketik). Tanpa berkas ini SvelteKit
	 * menampilkan "404 Not Found" polos tanpa jalan kembali. Halaman ini di luar
	 * layout dashboard, jadi tautan kembali harus ada di sini sendiri; Overview
	 * mengantar ke login bila sesinya sudah habis.
	 */
	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title
		>{isNotFound ? 'Halaman tidak ditemukan' : 'Terjadi gangguan'} — Sistem Telemetering PLTA</title
	>
</svelte:head>

<main class="flex min-h-dvh items-center justify-center bg-surface-base px-4">
	<div
		class="w-full max-w-md rounded-xl border border-border-subtle bg-surface-raised px-6 py-10 text-center"
	>
		<p class="font-mono text-xs text-text-muted tabular-nums">{page.status}</p>
		<h1 class="mt-1 text-base font-semibold text-text-strong">
			{isNotFound ? 'Halaman tidak ditemukan' : 'Halaman ini gagal ditampilkan'}
		</h1>
		<p class="mx-auto mt-1 max-w-sm text-sm text-text-muted">
			{isNotFound
				? 'Alamat yang dibuka tidak ada di aplikasi ini. Periksa kembali alamatnya, atau kembali ke Overview.'
				: 'Terjadi gangguan saat menyiapkan halaman. Kembali ke Overview, lalu coba buka lagi.'}
		</p>
		<div class="mt-5 flex justify-center">
			<a href="/dashboard/overview" class="btn btn-primary">Kembali ke Overview</a>
		</div>
	</div>
</main>
