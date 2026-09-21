<script lang="ts">
	import SourceMarker from '$components/controls/SourceMarker.svelte';
	import type { MetricRow, MetricSource } from './presentation';

	/**
	 * Daftar parameter bulanan: label + penanda sumber di kiri, nilai + satuan di
	 * kanan, dipisah garis. Tanpa kartu pembungkus dan tanpa header kolom.
	 */
	let { rows }: { rows: MetricRow[] } = $props();

	const sourceClasses: Record<MetricSource, string> = {
		api: 'text-brand-primary-pressed',
		formula: 'text-violet-700',
		input: 'text-status-warning-strong',
		constant: 'text-text-subtle',
		'constant-input': 'text-status-warning-strong',
		unavailable: 'text-text-muted'
	};
</script>

<div class="border-t border-border-subtle">
	{#each rows as row (row.label)}
		{@const isUnavailable = row.sourceType === 'unavailable'}
		<div
			class="flex items-center justify-between gap-3 border-b border-surface-overlay py-[9px] last:border-b-0"
		>
			<span class="flex min-w-0 items-center gap-[7px]">
				<span
					class={`truncate text-sm ${isUnavailable ? 'text-text-muted' : 'text-text-secondary'}`}
				>
					{row.label}
				</span>
				<span title={row.source} class={`flex shrink-0 ${sourceClasses[row.sourceType]}`}>
					<SourceMarker type={row.sourceType} />
					<span class="sr-only">{row.source}</span>
				</span>
			</span>
			<span class={`metric-value shrink-0 text-sm ${isUnavailable ? 'text-text-muted' : ''}`}>
				{row.value}{#if row.unit}<span class="metric-unit ml-1">{row.unit}</span>{/if}
			</span>
		</div>
	{/each}
</div>
