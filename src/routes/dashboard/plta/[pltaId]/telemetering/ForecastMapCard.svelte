<script lang="ts">
	import { Dialog } from 'bits-ui';
	import IconImageBroken from '~icons/ph/image-broken';
	import IconMagnifyingGlassPlus from '~icons/ph/magnifying-glass-plus';
	import IconX from '~icons/ph/x';
	import Skeleton from '$components/atoms/Skeleton.svelte';

	interface Props {
		title: string;
		subtitle: string;
		imageUrl: string | null;
		isLoading: boolean;
		isError: boolean;
	}

	/**
	 * Kartu ini hanya menampilkan. Unggahnya ada di menu Upload karena satu gambar
	 * berlaku untuk seluruh PLTA — mengunggahnya dari halaman yang ter-scope satu
	 * PLTA menyiratkan cakupan yang salah.
	 *
	 * Petak 190px terlalu kecil untuk membaca peta prakiraan BMKG, jadi gambarnya
	 * bisa diklik untuk dibuka besar. Ukuran kartu sengaja tidak dibesarkan:
	 * kedua gambar berdampingan dengan tabel prakiraan, dan memperbesarnya di
	 * tempat akan mendorong tabel itu ke bawah lipatan layar.
	 */
	let { title, subtitle, imageUrl, isLoading, isError }: Props = $props();

	let isZoomOpen = $state(false);

	const meta = $derived(
		isLoading ? 'Memuat…' : imageUrl ? subtitle : isError ? 'Gagal dimuat' : 'Belum tersedia'
	);
</script>

<article class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
	<div class="flex h-[190px] items-center justify-center bg-surface-overlay">
		{#if isLoading}
			<Skeleton class="size-full rounded-none" />
		{:else if imageUrl}
			<button
				type="button"
				onclick={() => (isZoomOpen = true)}
				aria-label={`Perbesar gambar ${title}`}
				class="group relative size-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-strong focus-visible:ring-inset"
			>
				<img src={imageUrl} alt={title} class="size-full object-contain" />
				<span
					aria-hidden="true"
					class="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-surface-raised/90 px-1.5 py-1 text-xs font-medium text-text-secondary opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
				>
					<IconMagnifyingGlassPlus class="size-3.5" />
					Perbesar
				</span>
			</button>
		{:else}
			<div class="flex flex-col items-center gap-2 px-4 text-center">
				<IconImageBroken
					class={`size-5 ${isError ? 'text-status-danger-strong' : 'text-disabled'}`}
				/>
				<span class={`text-xs ${isError ? 'text-status-danger-strong' : 'text-text-muted'}`}>
					{isError ? 'Gambar gagal dimuat' : 'Gambar belum tersedia'}
				</span>
			</div>
		{/if}
	</div>
	<div class="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2">
		<span class="truncate text-xs font-medium text-text-primary">{title}</span>
		<span class="shrink-0 text-xs text-text-muted">{meta}</span>
	</div>
</article>

<!--
	Dialog ikut terlepas begitu `imageUrl` jadi null — mis. operator mengganti
	bulan ke periode yang gambarnya belum diunggah — jadi tidak ada panel yang
	tertinggal terbuka di atas gambar yang sudah tidak ada.
-->
{#if imageUrl}
	<Dialog.Root open={isZoomOpen} onOpenChange={(open) => (isZoomOpen = open)}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 z-100 bg-scrim" />

			<Dialog.Content
				class="fixed top-1/2 left-1/2 z-100 flex max-h-[calc(100vh-3rem)] w-[calc(100vw-2rem)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-raised shadow-dialog outline-none"
			>
				<header
					class="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3"
				>
					<div class="min-w-0">
						<Dialog.Title class="truncate text-sm font-semibold text-text-primary">
							{title}
						</Dialog.Title>
						<Dialog.Description class="truncate text-xs text-text-muted">
							{subtitle}
						</Dialog.Description>
					</div>

					<Dialog.Close
						aria-label="Tutup gambar"
						class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
					>
						<IconX class="size-3.5" />
					</Dialog.Close>
				</header>

				<div
					class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-overlay p-3"
				>
					<img
						src={imageUrl}
						alt={title}
						class="max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain"
					/>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}
