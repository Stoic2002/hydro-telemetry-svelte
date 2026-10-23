<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';

	interface Tip {
		/** Kata kunci yang ditebalkan di depan kalimat, mis. nama kolom. */
		term?: string;
		text: string;
	}

	interface Props {
		tips: readonly Tip[];
	}

	/**
	 * "Cara mengisi" di kolom samping tab Upload: paling banyak tiga poin satu
	 * kalimat, lalu tautan ke bab Upload di Panduan untuk penjelasan lengkap.
	 * Dulu tiap panel menulis paragraf sendiri-sendiri, dan kolom sampingnya
	 * lebih panjang daripada kotak unggahnya (23 Okt 2026).
	 */
	let { tips }: Props = $props();
</script>

<div class="flex flex-col gap-2 border-t border-border-subtle pt-2.5">
	<p class="table-head-cell">Cara mengisi</p>
	<ul class="flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-text-muted">
		{#each tips as tip (tip.text)}
			<li>
				{#if tip.term}<span class="font-medium text-text-secondary">{tip.term}</span>{/if}
				{tip.text}
			</li>
		{/each}
	</ul>
	<a
		href="/dashboard/panduan#bab-upload"
		class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
	>
		Panduan lengkap
		<IconArrowRight class="size-3.5" aria-hidden="true" />
	</a>
</div>
