<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	/**
	 * Wadah gulir horizontal untuk tabel lebar, dengan bayangan di tepi yang
	 * masih menyimpan kolom tersembunyi. Scrollbar macOS dan layar sentuh baru
	 * muncul saat digulir, jadi tanpa bayangan ini operator tidak tahu ada kolom
	 * lain di kanan — di User Management itu kolom Aksi.
	 */
	let { children, class: className = '' }: Props = $props();

	let scroller = $state<HTMLDivElement | null>(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function measure() {
		if (!scroller) return;
		const { scrollLeft, scrollWidth, clientWidth } = scroller;
		canScrollLeft = scrollLeft > 1;
		canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
	}

	$effect(() => {
		if (!scroller) return;
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
		return () => observer.disconnect();
	});
</script>

<div class={`relative ${className}`}>
	<div bind:this={scroller} onscroll={measure} class="overflow-x-auto">
		{@render children()}
	</div>
	<span
		aria-hidden="true"
		class={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-black/12 to-transparent transition-opacity duration-150 ${
			canScrollLeft ? 'opacity-100' : 'opacity-0'
		}`}
	></span>
	<span
		aria-hidden="true"
		class={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-black/12 to-transparent transition-opacity duration-150 ${
			canScrollRight ? 'opacity-100' : 'opacity-0'
		}`}
	></span>
</div>
