<script lang="ts">
	import IconGauge from '~icons/ph/gauge';
	import type { DmnUnit } from '$features/hydrology';
	import { formatNumber } from '$shared/utils/number';

	interface Props {
		units: DmnUnit[];
		selectedUnits: number[];
		manualDmn: number | undefined;
		isBusy?: boolean;
		onChange: (units: number[], manualDmn: number | undefined) => void;
	}

	/**
	 * Penyebut DMN untuk Service Hour Full Load dan metrik "thd target".
	 *
	 * Digambar sebagai pita datar, bukan kartu: ia tinggal di dalam kartu zona
	 * Hulu, dan wadah di dalam wadah melanggar aturan tata letak project.
	 *
	 * Operator biasanya cukup mencentang unit yang sedang jalan; server yang
	 * menjumlahkan DMN-nya. Isian DMN manual disembunyikan di balik tombol
	 * karena hanya dipakai saat DMN nyata tidak sama dengan penjumlahan unit —
	 * derating atau hasil uji kinerja. Di server, DMN manual **menang** atas
	 * pilihan unit, jadi keduanya tidak pernah aktif bersamaan di sini.
	 */
	let { units, selectedUnits, manualDmn, isBusy = false, onChange }: Props = $props();

	let isManualOpen = $state(false);
	let manualDraft = $state<number | null>(null);

	/**
	 * Disinkronkan ulang, bukan sekadar nilai awal: `manualDmn` datang dari query
	 * string, jadi ia berubah saat operator menekan Kembali atau membuka tautan
	 * yang sudah membawa `?dmn=`. Tanpa ini panelnya menampilkan keadaan lama.
	 */
	$effect(() => {
		if (manualDmn === undefined) return;

		isManualOpen = true;
		manualDraft = manualDmn;
	});

	const totalDmn = $derived(units.reduce((total, item) => total + item.dmnMw, 0));
	const activeDmn = $derived(
		selectedUnits.length === 0
			? totalDmn
			: units
					.filter((item) => selectedUnits.includes(item.unit))
					.reduce((total, item) => total + item.dmnMw, 0)
	);

	function toggleUnit(unit: number) {
		const next = selectedUnits.includes(unit)
			? selectedUnits.filter((value) => value !== unit)
			: [...selectedUnits, unit].sort((left, right) => left - right);

		// Seluruh unit tercentang sama artinya dengan tanpa saringan — dikirim
		// kosong supaya URL-nya tidak menyimpan keadaan bawaan.
		onChange(next.length === units.length ? [] : next, undefined);
	}

	function applyManual() {
		onChange([], manualDraft === null || manualDraft <= 0 ? undefined : manualDraft);
	}

	function clearManual() {
		manualDraft = null;
		isManualOpen = false;
		onChange(selectedUnits, undefined);
	}
</script>

{#if units.length > 0}
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
			<span class="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
				<IconGauge class="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
				Unit beban penuh
			</span>
			<span class="font-mono text-xs text-text-muted">
				<span class="font-medium text-text-primary">{formatNumber(activeDmn, 1)} MW</span>
				{#if manualDmn !== undefined}
					· manual
				{:else if selectedUnits.length === 0}
					· semua
				{/if}
			</span>
		</div>

		<div class="flex flex-wrap items-center gap-1.5">
			{#each units as item (item.unit)}
				{@const isOn =
					manualDmn === undefined &&
					(selectedUnits.length === 0 || selectedUnits.includes(item.unit))}
				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-label={`Unit ${item.unit}, ${formatNumber(item.dmnMw, 1)} MW`}
					disabled={isBusy || manualDmn !== undefined}
					onclick={() => toggleUnit(item.unit)}
					class={`inline-flex h-7 items-center rounded-lg border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
						isOn
							? 'border-brand-tint-border bg-brand-tint text-brand-primary-pressed'
							: 'border-border-subtle bg-surface-base text-text-muted hover:border-border-strong'
					}`}
				>
					U{item.unit}
				</button>
			{/each}

			{#if !isManualOpen}
				<button
					type="button"
					disabled={isBusy}
					onclick={() => (isManualOpen = true)}
					class="h-7 px-1.5 text-xs font-medium text-brand-primary-strong transition-colors hover:text-brand-primary-pressed disabled:opacity-50"
				>
					DMN manual
				</button>
			{/if}
		</div>

		{#if isManualOpen}
			<div class="flex flex-wrap items-center gap-1.5">
				<input
					type="number"
					min="0"
					step="any"
					aria-label="DMN manual dalam MW"
					placeholder={String(totalDmn)}
					disabled={isBusy}
					bind:value={manualDraft}
					class="field h-7 w-24 text-[13px]"
				/>
				<button
					type="button"
					disabled={isBusy}
					onclick={applyManual}
					class="h-7 rounded-lg border border-border-subtle px-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong disabled:opacity-50"
				>
					Terapkan
				</button>
				<button
					type="button"
					disabled={isBusy}
					onclick={clearManual}
					class="h-7 px-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
				>
					Batal
				</button>
			</div>
		{/if}
	</div>
{/if}
