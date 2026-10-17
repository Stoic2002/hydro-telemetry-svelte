<script lang="ts">
	import Badge from '$components/controls/Badge.svelte';
	import SourceMarker from '$components/controls/SourceMarker.svelte';
	import {
		MONTHLY_COLUMNS,
		type MetricSource,
		type MonthlyAchievementView,
		type MonthlyCell,
		type MonthlyComparison
	} from './presentation';

	/**
	 * Parameter bulanan berpasangan: tiap baris satu parameter, kolomnya target,
	 * prediksi, dan realisasi — operator membandingkan ketiganya tanpa mencari
	 * baris yang saling berkaitan di daftar panjang. Sel tanpa padanan memakai
	 * tanda hubung, bukan `N/A`.
	 */
	let { comparison }: { comparison: MonthlyComparison } = $props();

	const sourceClasses: Record<MetricSource, string> = {
		api: 'text-brand-primary-pressed',
		formula: 'text-violet-700',
		input: 'text-status-warning-strong',
		'constant-input': 'text-status-warning-strong',
		unavailable: 'text-text-muted'
	};
</script>

{#snippet value(cell: MonthlyCell)}
	<span
		title={cell.source}
		class={`inline-flex items-center justify-end gap-[7px] ${sourceClasses[cell.sourceType]}`}
	>
		<SourceMarker type={cell.sourceType} />
		<span class="sr-only">{cell.source}</span>
		<span
			class={`metric-value text-sm ${cell.sourceType === 'unavailable' ? 'text-text-muted' : 'text-text-primary'}`}
		>
			{cell.value}
		</span>
	</span>
{/snippet}

{#snippet achievementRow(achievement: MonthlyAchievementView)}
	<tr>
		<!--
			Menjorok dengan garis kiri: baris ini milik baris energi di atasnya,
			bukan parameter tersendiri. Tanpa itu operator mengira ada dua
			"prognosa" yang berbeda (13 Okt 2026).
		-->
		<th scope="row" class="pr-3 pb-[9px] text-left text-xs font-normal text-text-muted">
			<span class="ml-1 block border-l-2 border-border-strong pl-2">
				Prognosa pencapaian <span class="text-text-subtle">thd target</span>
			</span>
		</th>
		<td colspan={MONTHLY_COLUMNS.length} class="px-2 pb-[9px] text-right">
			<span class="inline-flex flex-wrap items-center justify-end gap-2">
				<span
					class={`metric-value text-sm ${achievement.isAvailable ? 'text-text-primary' : 'text-text-muted'}`}
				>
					{achievement.value}{#if achievement.isAvailable}<span class="metric-unit ml-1">%</span
						>{/if}
				</span>
				{#if achievement.status}
					<Badge tone={achievement.status === 'achieved' ? 'green' : 'amber'}>
						{achievement.status === 'achieved' ? 'Tercapai' : 'Belum tercapai'}
					</Badge>
				{/if}
			</span>
		</td>
	</tr>
{/snippet}

<table class="w-full border-collapse text-left">
	<thead>
		<tr class="border-y border-border-subtle">
			<th scope="col" class="table-head-cell py-2 pr-3 font-medium">Parameter</th>
			{#each MONTHLY_COLUMNS as column (column.key)}
				<th scope="col" class="table-head-cell px-2 py-2 text-right font-medium">
					{column.label}
				</th>
			{/each}
		</tr>
	</thead>
	<!--
		Satu <tbody> per parameter beserta baris pencapaiannya. Pemisah antar
		kelompok sengaja tebal (2px, `border-strong`); pemisah tipis membuat dua
		baris "Prognosa pencapaian" terbaca sebagai satu daftar.
	-->
	{#each comparison.rows as row, index (row.label)}
		<tbody
			class={`last:border-b last:border-border-subtle ${index > 0 ? 'border-t-2 border-border-strong' : ''}`}
		>
			<tr class="align-top">
				<th scope="row" class="py-[9px] pr-3 text-left font-normal">
					<span class="block text-sm text-text-secondary">
						{row.label}{#if row.unit}<span class="metric-unit ml-1">{row.unit}</span>{/if}
					</span>
				</th>
				{#each MONTHLY_COLUMNS as column (column.key)}
					{@const cell = row.cells[column.key]}
					<td class="px-2 py-[9px] text-right">
						{#if cell}
							{@render value(cell)}
						{:else}
							<span class="text-sm text-text-placeholder" aria-label="Tidak berlaku">—</span>
						{/if}
					</td>
				{/each}
			</tr>
			{#if row.achievement}
				{@render achievementRow(row.achievement)}
			{/if}
		</tbody>
	{/each}
</table>

<p class="mt-2 text-xs leading-relaxed text-text-muted">
	Kolom <span class="font-medium text-text-secondary">Prediksi</span> pada energi adalah
	<span class="font-medium text-text-secondary">prognosa ketersediaan energi primer</span>;
	<span class="font-medium text-text-secondary">target</span> dan
	<span class="font-medium text-text-secondary">realisasi</span> adalah produksi energi listrik. Prognosa
	pencapaian = prognosa ÷ target.
</p>
