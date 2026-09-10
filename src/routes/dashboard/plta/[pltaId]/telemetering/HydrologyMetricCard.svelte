<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconCaretDown from '~icons/ph/caret-down';
	import IconCaretUp from '~icons/ph/caret-up';
	import { HYDROLOGY_ZONE_PRESENTATION, type HydrologyZone } from '$features/plta';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import MetricRowItem from './MetricRowItem.svelte';
	import type { MetricSection } from './presentation';

	interface Props {
		zone: HydrologyZone;
		isHighlighted?: boolean;
		onHighlightChange?: (isHighlighted: boolean) => void;
		sections: MetricSection[];
		onUpload?: (target: DailyTelemetryUploadTarget) => void;
		/**
		 * Kontrol milik zona ini, mis. pemilih penyebut DMN di Hulu. Dirender
		 * sebagai pita tepat di bawah header, bukan di antara baris metrik: daftar
		 * barisnya generik untuk ketiga zona, jadi menyisipkan kontrol di sana
		 * berarti mengistimewakan satu kunci metrik. Header sendiri terlalu sempit
		 * — ketiga kartu berbagi satu baris tiga kolom.
		 */
		zoneControl?: Snippet;
		/** Diikat pemanggil supaya kartu bisa difokuskan saat zonanya dipilih di peta. */
		element?: HTMLElement | null;
	}

	let {
		zone,
		isHighlighted = false,
		onHighlightChange,
		sections,
		onUpload,
		zoneControl,
		element = $bindable(null)
	}: Props = $props();

	const COMPACT_ROW_LIMIT = 5;

	let isExpanded = $state(false);

	const presentation = $derived(HYDROLOGY_ZONE_PRESENTATION[zone]);
	const rowCount = $derived(sections.reduce((total, section) => total + section.rows.length, 0));
	const canToggle = $derived(rowCount > COMPACT_ROW_LIMIT);

	/**
	 * Batas ringkas berlaku untuk seluruh kartu, bukan per bagian: kalau setiap
	 * bagian memotong lima baris sendiri-sendiri, kartu dengan tiga bagian akan
	 * menampilkan lima belas baris dan tidak lagi ringkas.
	 */
	const visibleSections = $derived(
		sections.map((section, sectionIndex) => {
			const precedingRowCount = sections
				.slice(0, sectionIndex)
				.reduce((total, preceding) => total + preceding.rows.length, 0);
			const remainingVisibleRows = Math.max(0, COMPACT_ROW_LIMIT - precedingRowCount);

			return {
				...section,
				rows: isExpanded ? section.rows : section.rows.slice(0, remainingVisibleRows)
			};
		})
	);
</script>

<article
	bind:this={element}
	tabindex="-1"
	onpointerenter={() => onHighlightChange?.(true)}
	onpointerleave={() => onHighlightChange?.(false)}
	onfocusin={() => onHighlightChange?.(true)}
	onfocusout={(event) => {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
		onHighlightChange?.(false);
	}}
	class={`flex h-full flex-col transition-colors duration-200 outline-none ${
		isHighlighted
			? `ring-2 ring-inset ${presentation.highlightSurfaceClassName} ${presentation.highlightRingClassName}`
			: ''
	}`}
>
	<div
		class={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${presentation.borderClassName}`}
	>
		<div class="flex items-center gap-2">
			<span
				class={`flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${presentation.badgeClassName}`}
			>
				{presentation.order}
			</span>
			<h3 class="text-sm font-semibold text-text-primary">{presentation.title}</h3>
		</div>
		<span class="shrink-0 text-xs text-text-muted">{rowCount} parameter</span>
	</div>

	{#if zoneControl}
		<div class={`border-b px-4 py-2.5 ${presentation.borderClassName}`}>
			{@render zoneControl()}
		</div>
	{/if}

	{#each visibleSections as section (section.title)}
		<section class="flex-1">
			{#if visibleSections.length > 1}
				<div class="table-head-cell px-4 py-2">{section.title}</div>
			{/if}
			<div class={`divide-y ${presentation.dividerClassName} px-4`}>
				{#each section.rows as row (row.label)}
					<MetricRowItem {row} {onUpload} />
				{/each}
			</div>
		</section>
	{/each}

	{#if canToggle}
		<button
			type="button"
			onclick={() => (isExpanded = !isExpanded)}
			aria-expanded={isExpanded}
			class="flex cursor-pointer items-center gap-1 px-4 py-2.5 text-left text-xs font-medium text-brand-primary-strong transition-colors hover:text-brand-primary-pressed"
		>
			{#if isExpanded}
				<IconCaretUp class="size-3.5" />
				Ringkas parameter
			{:else}
				<IconCaretDown class="size-3.5" />
				Lihat semua ({rowCount})
			{/if}
		</button>
	{/if}
</article>
