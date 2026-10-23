<script lang="ts">
	import type { Component } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import IconDots from '~icons/ph/dots-three-bold';

	export interface OverflowMenuItem {
		label: string;
		icon?: Component<{ class?: string; 'aria-hidden'?: 'true' }>;
		onSelect: () => void;
	}

	interface Props {
		/** Wajib: pemicunya hanya ikon. */
		ariaLabel: string;
		items: readonly OverflowMenuItem[];
	}

	/**
	 * Menu ⋯ untuk aksi yang jarang dipakai di kepala halaman — pengaturan
	 * admin dan sejenisnya — supaya tidak sebaris setara dengan filter yang
	 * dipakai setiap hari. Pemicunya berbingkai setinggi kontrol `md`: ikon polos
	 * tanpa bingkai tidak terlihat tim (23 Okt 2026).
	 */
	let { ariaLabel, items }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label={ariaLabel}
		title={ariaLabel}
		class="btn btn-ghost size-10 shrink-0 px-0 data-[state=open]:bg-surface-overlay"
	>
		<IconDots class="size-4 text-text-secondary" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			align="end"
			sideOffset={6}
			class="z-200 min-w-52 rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-overlay outline-none"
		>
			{#each items as item (item.label)}
				<DropdownMenu.Item
					onSelect={item.onSelect}
					class="flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary outline-none data-highlighted:bg-surface-overlay data-highlighted:text-text-primary"
				>
					{#if item.icon}
						<item.icon class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
					{/if}
					{item.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
