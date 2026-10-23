<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import IconCheck from '~icons/ph/check';
	import IconDots from '~icons/ph/dots-three-bold';

	import { DAILY_ZONE_FILTERS, type DailyRowFilter, type DailyZoneFilter } from '../presentation';

	interface Props {
		zone: DailyZoneFilter;
		row: DailyRowFilter;
		/** Pilihan baris yang boleh dipakai peran ini (Viewer tanpa Isian manual). */
		rowOptions: readonly { value: DailyRowFilter; label: string }[];
		/** Mengubah zona dan baris dalam SATU navigasi; nilai yang tidak dikirim tetap. */
		onChange: (changes: { zone?: DailyZoneFilter; row?: DailyRowFilter }) => void;
	}

	/**
	 * Mode tampilan Hidrologi Harian di balik menu titik tiga. Dulu dua
	 * segmented control (Zona, Baris) sebaris penuh di atas panel; tim menilai
	 * barisnya memakan tempat untuk pengaturan yang jarang diganti (23 Okt 2026).
	 * Supaya mode yang sedang aktif tidak tersembunyi, namanya tampil di
	 * pemicunya selama bukan bawaan.
	 */
	let { zone, row, rowOptions, onChange }: Props = $props();

	const activeLabels = $derived(
		[
			zone === 'semua' ? null : DAILY_ZONE_FILTERS.find((option) => option.value === zone)?.label,
			row === 'semua' ? null : rowOptions.find((option) => option.value === row)?.label
		].filter((label): label is string => Boolean(label))
	);
	const isFiltered = $derived(activeLabels.length > 0);

	const ITEM_CLASS =
		'flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary outline-none data-highlighted:bg-surface-overlay data-highlighted:text-text-primary';
	const HEADING_CLASS = 'px-3 pt-2 pb-1 text-[11px] font-medium text-text-muted';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label={isFiltered ? `Mode tampilan: ${activeLabels.join(', ')}` : 'Mode tampilan'}
		class="btn btn-ghost btn-sm h-9 data-[state=open]:bg-surface-overlay"
	>
		<!--
			Tombol berbingkai bertuliskan Mode, bukan ikon polos: ikon titik tiga saja
			di ujung baris penanda tidak terlihat oleh tim (23 Okt 2026). Titik
			cyan menandai mode bukan bawaan. Bukan "Tampilan": ikon pengatur tiap panel
			sudah bernama "Atur tampilan".
		-->
		{#if isFiltered}
			<span class="size-1.5 shrink-0 rounded-full bg-brand-primary-strong" aria-hidden="true"
			></span>
			{activeLabels.join(' · ')}
		{:else}
			Mode
		{/if}
		<IconDots class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="end"
			sideOffset={6}
			class="z-200 w-56 rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-overlay outline-none"
		>
			<DropdownMenu.RadioGroup
				value={zone}
				onValueChange={(value) => onChange({ zone: value as DailyZoneFilter })}
			>
				<DropdownMenu.GroupHeading class={HEADING_CLASS}>Zona</DropdownMenu.GroupHeading>
				{#each DAILY_ZONE_FILTERS as option (option.value)}
					{@render radioItem(option.value, option.label)}
				{/each}
			</DropdownMenu.RadioGroup>

			<DropdownMenu.Separator class="my-1 h-px bg-surface-overlay" />

			<DropdownMenu.RadioGroup
				value={row}
				onValueChange={(value) => onChange({ row: value as DailyRowFilter })}
			>
				<DropdownMenu.GroupHeading class={HEADING_CLASS}>Baris</DropdownMenu.GroupHeading>
				{#each rowOptions as option (option.value)}
					{@render radioItem(option.value, option.label)}
				{/each}
			</DropdownMenu.RadioGroup>

			{#if isFiltered}
				<DropdownMenu.Separator class="my-1 h-px bg-surface-overlay" />
				<DropdownMenu.Item
					onSelect={() => onChange({ zone: 'semua', row: 'semua' })}
					class={`${ITEM_CLASS} font-medium text-brand-primary-strong data-highlighted:text-brand-primary-pressed`}
				>
					Tampilkan semua
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

{#snippet radioItem(value: string, label: string)}
	<DropdownMenu.RadioItem {value} class={ITEM_CLASS}>
		{#snippet children({ checked })}
			<span class="flex size-4 shrink-0 items-center justify-center">
				{#if checked}<IconCheck class="size-4 text-brand-primary-strong" aria-hidden="true" />{/if}
			</span>
			{label}
		{/snippet}
	</DropdownMenu.RadioItem>
{/snippet}
