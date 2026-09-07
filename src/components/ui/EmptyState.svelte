<script lang="ts">
	interface Props {
		title: string;
		description: string;
		class?: string;
	}

	/**
	 * Keadaan kosong: border putus-putus, selalu dua baris — apa yang tidak ada,
	 * lalu apa yang bisa dilakukan.
	 *
	 * Komponen ini *adalah* wadahnya, bukan isi dari wadah lain. Membungkusnya
	 * lagi dengan kartu akan melanggar aturan "jangan ada wadah di dalam wadah".
	 *
	 * Ikon dihilangkan mengikuti `docs/design-system.md`: lingkaran ikon di versi
	 * React adalah hiasan yang tidak membawa informasi.
	 */
	let { title, description, class: className = '' }: Props = $props();
</script>

<div
	class={`rounded-xl border border-dashed border-border-subtle px-6 py-12 text-center ${className}`}
>
	<p class="text-sm font-medium text-text-secondary">{title}</p>
	<p class="mt-1 text-sm text-text-muted">{description}</p>
</div>
