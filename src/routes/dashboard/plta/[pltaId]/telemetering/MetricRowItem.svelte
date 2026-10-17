<script lang="ts">
	import IconCaretDown from '~icons/ph/caret-down';
	import IconClock from '~icons/ph/clock';
	import Badge from '$components/controls/Badge.svelte';
	import SourceMarker, { SOURCE_MARKER_LABEL } from '$components/controls/SourceMarker.svelte';
	import { formatDayMonthTimeWIB } from '$shared/lib/date';
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
	const freshness = $derived(row.freshness);

	// Kata terakhir label diikat ke penanda sumber, supaya penanda tidak
	// tertinggal sendirian di baris baru saat label dibungkus.
	const labelSplit = $derived(row.label.lastIndexOf(' '));
	const labelHead = $derived(labelSplit > 0 ? row.label.slice(0, labelSplit + 1) : '');
	const labelTail = $derived(labelSplit > 0 ? row.label.slice(labelSplit + 1) : row.label);
</script>

<div
	class="scroll-mt-24 py-2"
	id={row.key ? `metric-${row.key}` : undefined}
	data-freshness={freshness?.level}
>
	<div class="flex items-center justify-between gap-3">
		<!--
			Label dibungkus ke baris berikutnya, bukan dipotong: nama parameter
			yang panjang dulu berakhir "…" tanpa cara membaca sisanya. Penanda
			sumber menempel di ujung label; tombol stasiun/isian turun ke bawah
			bila tidak muat.
		-->
		<div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
			<span class="min-w-0 text-sm break-words text-text-secondary">
				{labelHead}<span class="whitespace-nowrap"
					>{labelTail}<SourceMarker
						type={row.sourceType}
						class="ml-1.5 inline-block align-middle"
					/></span
				><span class="sr-only">, sumber {SOURCE_MARKER_LABEL[row.sourceType]}</span>
			</span>

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

		<span class="flex shrink-0 items-center gap-2">
			{#if freshness}
				<!--
					Teks umur ada di dalam badge, jadi warnanya bukan satu-satunya
					penanda. Waktu ukur persisnya di title dan teks sr-only; untuk sensor
					yang basi juga tampil di bawah baris.
					Nilai basi diredupkan ke `text-muted`, bukan `opacity`: token itu
					warna teks paling redup yang masih lolos WCAG AA.
				-->
				<span title={`Terakhir diukur ${formatDayMonthTimeWIB(freshness.measuredAt)} WIB`}>
					<Badge tone={freshness.level === 'stale' ? 'red' : 'amber'}>
						{#snippet icon()}<IconClock class="size-3" aria-hidden="true" />{/snippet}
						{freshness.ageLabel}
						<span class="sr-only">
							, terakhir diukur {formatDayMonthTimeWIB(freshness.measuredAt)} WIB
						</span>
					</Badge>
				</span>
			{/if}
			{#if row.isRecalculating}
				<!--
					Shimmer selebar angka biasa, hanya di sel nilai: label, penanda, dan
					tinggi baris tetap, jadi kartunya tidak menciut atau melompat.
				-->
				<span role="status" class="flex items-center">
					<span class="skeleton-shimmer h-4 w-20 rounded" aria-hidden="true"></span>
					<span class="sr-only">Menghitung ulang {row.label}…</span>
				</span>
			{:else}
				<span
					class={`metric-value text-right text-sm whitespace-nowrap ${
						freshness?.level === 'stale' ? 'text-text-muted' : ''
					}`}
				>
					{row.value}{#if row.unit}<span class="metric-unit ml-1">{row.unit}</span>{/if}
				</span>
			{/if}
		</span>
	</div>

	{#if freshness?.level === 'stale'}
		<!--
			Waktu ukur persis untuk sensor yang basi juga tampil sebagai teks, bukan
			hanya di tooltip yang tidak bisa dibuka di layar sentuh.
		-->
		<p aria-hidden="true" class="mt-0.5 text-right text-xs text-text-muted">
			Terakhir diukur {formatDayMonthTimeWIB(freshness.measuredAt)} WIB
		</p>
	{/if}

	{#if hasSubRows && isOpen}
		<div class="mt-1.5 border-l border-border-subtle pl-2.5">
			{#each subRows as subRow (subRow.label)}
				<div class="flex items-center justify-between gap-3 py-1">
					<span class="min-w-0 text-xs break-words text-text-muted">{subRow.label}</span>
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
