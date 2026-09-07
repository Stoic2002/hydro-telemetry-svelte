<script lang="ts">
	import IconCaretDown from '~icons/ph/caret-down';
	import SourceMarker from '$components/atoms/SourceMarker.svelte';
	import type { DailyTelemetryUploadTarget } from '$features/telemetry-upload';
	import type { MetricRow } from './presentation';

	interface Props {
		row: MetricRow;
		onUpload?: (target: DailyTelemetryUploadTarget) => void;
	}

	let { row, onUpload }: Props = $props();

	let isOpen = $state(false);

	const subRows = $derived(row.subRows ?? []);
	const hasSubRows = $derived(subRows.length > 0);
</script>

<div class="py-2">
	<div class="flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-1.5">
			<span class="truncate text-sm text-text-secondary">{row.label}</span>
			<SourceMarker type={row.sourceType} />

			{#if hasSubRows}
				<button
					type="button"
					onclick={() => (isOpen = !isOpen)}
					aria-expanded={isOpen}
					class="inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
				>
					{subRows.length} stasiun
					<IconCaretDown class={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
				</button>
			{/if}

			{#if row.uploadTarget && onUpload}
				{@const target = row.uploadTarget}
				<button
					type="button"
					onclick={() => onUpload(target)}
					class="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-brand-primary-strong transition-colors hover:text-brand-primary-pressed"
				>
					{row.hasData ? 'Edit data' : 'Input data'}
				</button>
			{/if}
		</div>

		<span class="metric-value shrink-0 text-right text-sm whitespace-nowrap">
			{row.value}{#if row.unit}<span class="metric-unit ml-1">{row.unit}</span>{/if}
		</span>
	</div>

	{#if hasSubRows && isOpen}
		<div class="mt-1.5 border-l border-border-subtle pl-2.5">
			{#each subRows as subRow (subRow.label)}
				<div class="flex items-center justify-between gap-3 py-1">
					<span class="truncate text-xs text-text-muted">{subRow.label}</span>
					<span
						class="shrink-0 text-right font-mono text-xs whitespace-nowrap text-text-secondary tabular-nums"
					>
						{subRow.value}{#if subRow.unit}<span class="ml-1 text-text-muted">{subRow.unit}</span
							>{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
