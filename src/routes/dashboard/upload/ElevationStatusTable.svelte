<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import Badge, { type BadgeTone } from '$components/controls/Badge.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import { createElevationStatusQuery, type ElevationReadiness } from '$features/uploads';
	import { formatNumber } from '$shared/utils/number';

	interface Props {
		/** Tahun penentu kurva berlaku: published terbaru ber-tahun ≤ ini. */
		year: number;
		selectedPltaId: string;
		onSelect: (pltaId: string) => void;
	}

	/**
	 * Kesiapan kurva EVA seluruh PLTA. Tiga status, bukan "ada/tidak": kurva
	 * draft sudah diunggah tetapi BELUM dipakai perhitungan, jadi seluruh volume
	 * waduk dan turunannya (volume efektif, ketersediaan energi, inflow) masih
	 * kosong. Baris dipilih untuk berpindah PLTA di panel unggah di bawahnya.
	 */
	let { year, selectedPltaId, onSelect }: Props = $props();

	const statusQuery = createElevationStatusQuery(() => year);
	const status = $derived(statusQuery.data);

	const READINESS: Record<ElevationReadiness, { label: string; tone: BadgeTone }> = {
		ready: { label: 'Siap', tone: 'green' },
		draft: { label: 'Draft', tone: 'amber' },
		missing: { label: 'Belum ada', tone: 'slate' }
	};

	function elevationRange(min: number | null, max: number | null): string {
		return min === null || max === null ? '—' : `${formatNumber(min, 2)} – ${formatNumber(max, 2)}`;
	}
</script>

<section aria-labelledby="elevation-status-title">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h2 id="elevation-status-title" class="section-title">Status kurva seluruh PLTA</h2>
		{#if status}
			<p class="text-xs text-text-muted">
				<span class="font-medium text-text-secondary">{status.totals.ready}</span> dari
				{status.totals.plants} PLTA siap{#if status.totals.draft > 0}
					· {status.totals.draft} menunggu publish{/if}
				· {status.totals.missing} belum ada kurva
			</p>
		{/if}
	</div>
	<p class="mt-1 text-xs text-text-muted">
		Hanya kurva berstatus <span class="font-medium text-text-secondary">published</span> yang dipakai
		menghitung volume waduk. Kurva lama tetap berlaku sampai ada kurva published yang lebih baru.
	</p>

	{#if statusQuery.isLoading}
		<div role="status" class="mt-3 flex flex-col gap-2">
			{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
				<div class="skeleton-shimmer h-9 rounded-lg"></div>
			{/each}
			<span class="sr-only">Memuat status kurva...</span>
		</div>
	{:else if statusQuery.isError}
		<Banner tone="warning" title="Status kurva belum dapat dimuat" class="mt-3">
			<button
				type="button"
				onclick={() => void statusQuery.refetch()}
				class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
			>
				<IconRefresh class="size-3" />
				Coba lagi
			</button>
		</Banner>
	{:else if status}
		<div class="mt-3 overflow-x-auto rounded-xl border border-border-subtle">
			<table class="w-full min-w-[720px] border-collapse text-left">
				<thead>
					<tr class="border-b border-border-subtle bg-surface-overlay/50">
						<th class="table-head-cell px-3.5 py-2">PLTA</th>
						<th class="table-head-cell px-3.5 py-2">Status</th>
						<th class="table-head-cell px-3.5 py-2">Kurva berlaku</th>
						<th class="table-head-cell px-3.5 py-2 text-right">Titik</th>
						<th class="table-head-cell px-3.5 py-2 text-right">Elevasi (mdpl)</th>
						<th class="table-head-cell px-3.5 py-2">Draft</th>
					</tr>
				</thead>
				<tbody>
					{#each status.plants as plant (plant.pltaId)}
						{@const readiness = READINESS[plant.readiness]}
						{@const isSelected = plant.pltaId === selectedPltaId}
						<tr
							class={`border-b border-surface-overlay last:border-b-0 ${isSelected ? 'bg-brand-tint' : ''}`}
						>
							<td class="px-3.5 py-2">
								<button
									type="button"
									onclick={() => onSelect(plant.pltaId)}
									aria-current={isSelected ? 'true' : undefined}
									class="cursor-pointer text-left text-sm font-medium text-text-primary hover:text-brand-primary-strong"
								>
									{plant.plantName}
									<span class="ml-1 font-mono text-xs font-normal text-text-muted"
										>{plant.plantCode}</span
									>
								</button>
							</td>
							<td class="px-3.5 py-2">
								<Badge tone={readiness.tone}>{readiness.label}</Badge>
							</td>
							<td class="px-3.5 py-2 text-sm text-text-secondary">
								{plant.effectiveYear ?? '—'}
							</td>
							<td class="metric-value px-3.5 py-2 text-right text-sm text-text-secondary">
								{plant.pointCount === null ? '—' : formatNumber(plant.pointCount, 0)}
							</td>
							<td class="metric-value px-3.5 py-2 text-right text-xs text-text-secondary">
								{elevationRange(plant.minElevation, plant.maxElevation)}
							</td>
							<td class="px-3.5 py-2 text-xs text-text-muted">
								{plant.draftYears.length > 0 ? plant.draftYears.join(', ') : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
