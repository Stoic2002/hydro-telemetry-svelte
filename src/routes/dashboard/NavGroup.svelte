<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Portal } from 'bits-ui';
	import IconCaretDown from '~icons/ph/caret-down';
	import { page } from '$app/state';
	import { isNavActive } from './nav-active';
	import NavItem from './NavItem.svelte';

	interface Props {
		label: string;
		icon: Snippet;
		collapsed: boolean;
		/** Rute yang dibuka saat sidebar ciut atau saat judul grup diklik. */
		href: string;
		isActive: boolean;
		children: Snippet;
	}

	let { label, icon, collapsed, href, isActive, children }: Props = $props();

	// Grup terbuka sendiri ketika salah satu anaknya sedang aktif, lalu bisa
	// ditutup manual.
	let isOpen = $state(false);
	const isExpanded = $derived(isOpen || isActive);
	const isSelfActive = $derived(isNavActive(page.url.pathname, href));

	/**
	 * Saat sidebar diciutkan jadi 72px tidak ada ruang untuk label anak, tapi sub
	 * menu tetap harus terjangkau tanpa memaksa pengguna memperluas sidebar dulu.
	 * Polanya: ikon induk membuka panel mengambang di sebelah kanan rail.
	 *
	 * Panel dirender lewat portal karena `<nav>` memakai `overflow-y-auto`, yang
	 * membuat elemen absolut di dalamnya terpotong di tepi rail.
	 */
	let flyoutPosition = $state<{ top: number; left: number } | null>(null);
	let triggerElement = $state<HTMLElement | null>(null);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function openFlyout() {
		clearTimeout(closeTimer);
		const rect = triggerElement?.getBoundingClientRect();
		if (rect) flyoutPosition = { top: rect.top, left: rect.right + 8 };
	}

	// Penutupan ditunda sesaat supaya kursor sempat menyeberangi celah antara
	// ikon dan panel tanpa menutupnya.
	function scheduleClose() {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => (flyoutPosition = null), 120);
	}

	function closeNow() {
		clearTimeout(closeTimer);
		flyoutPosition = null;
	}

	$effect(() => {
		if (!flyoutPosition) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeNow();
		};

		// Posisi panel dihitung dari rect saat dibuka, jadi gulir atau ubah ukuran
		// akan membuatnya menggantung di tempat yang salah — tutup saja.
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('resize', closeNow);
		window.addEventListener('scroll', closeNow, true);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('resize', closeNow);
			window.removeEventListener('scroll', closeNow, true);
		};
	});

	$effect(() => () => clearTimeout(closeTimer));
</script>

{#if collapsed}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={triggerElement}
		onpointerenter={openFlyout}
		onpointerleave={scheduleClose}
		onfocusin={openFlyout}
		onfocusout={(event) => {
			if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
			scheduleClose();
		}}
	>
		<NavItem {href} collapsed={true} {icon} {label} />

		{#if flyoutPosition}
			<Portal>
				<div
					role="group"
					aria-label={`Sub menu ${label}`}
					onpointerenter={openFlyout}
					onpointerleave={scheduleClose}
					style={`top: ${flyoutPosition.top}px; left: ${flyoutPosition.left}px`}
					class="fixed z-200 w-56 rounded-xl border border-border-subtle bg-surface-raised p-1.5 shadow-panel"
				>
					<p class="px-3 pt-1 pb-1.5 text-xs font-medium tracking-wide text-text-muted uppercase">
						{label}
					</p>
					<div class="flex flex-col gap-0.5">{@render children()}</div>
				</div>
			</Portal>
		{/if}
	</div>
{:else}
	<div>
		<div
			class={`flex items-center gap-2.5 rounded-lg pr-2 transition-colors duration-[0.12s] ${
				isActive ? 'bg-surface-overlay' : 'hover:bg-surface-overlay'
			}`}
		>
			<a
				{href}
				aria-current={isSelfActive ? 'page' : undefined}
				class="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden px-3 py-1.5 text-sm whitespace-nowrap"
			>
				<span
					aria-hidden="true"
					class={`shrink-0 ${isActive ? 'text-text-primary' : 'text-text-muted'}`}
				>
					{@render icon()}
				</span>
				<span
					class={`font-sans text-sm ${
						isActive ? 'font-medium text-text-primary' : 'text-text-secondary'
					}`}
				>
					{label}
				</span>
			</a>
			<button
				type="button"
				aria-label={isExpanded ? `Ciutkan sub menu ${label}` : `Perluas sub menu ${label}`}
				aria-expanded={isExpanded}
				onclick={(event) => {
					event.stopPropagation();
					isOpen = !isExpanded;
				}}
				class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:text-text-secondary"
			>
				<IconCaretDown
					class={`size-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
				/>
			</button>
		</div>
		{#if isExpanded}
			<div class="mt-0.5 flex flex-col gap-0.5">{@render children()}</div>
		{/if}
	</div>
{/if}
