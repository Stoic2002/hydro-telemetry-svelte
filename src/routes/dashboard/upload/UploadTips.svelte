<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';
	import InfoTip from '$components/ui/InfoTip.svelte';

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
	 * lebih panjang daripada kotak unggahnya (23 Okt 2026). Sejak 9 Nov 2026
	 * poin-poinnya di tooltip (i), bukan daftar yang selalu tertulis — permintaan
	 * tim supaya halaman tidak penuh catatan.
	 */
	let { tips }: Props = $props();
</script>

<div class="flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
	<p class="table-head-cell flex items-center gap-1">
		Cara mengisi
		<InfoTip label="Cara mengisi template">
			<ul class="flex list-disc flex-col gap-1 pl-4">
				{#each tips as tip (tip.text)}
					<li>
						{#if tip.term}<strong class="font-medium text-surface-raised">{tip.term}</strong>{/if}
						{tip.text}
					</li>
				{/each}
			</ul>
		</InfoTip>
	</p>
	<a
		href="/dashboard/panduan#bab-upload"
		class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
	>
		Panduan lengkap
		<IconArrowRight class="size-3.5" aria-hidden="true" />
	</a>
</div>
