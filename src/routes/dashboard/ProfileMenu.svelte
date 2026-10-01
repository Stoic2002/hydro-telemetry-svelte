<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import IconCaretUpDown from '~icons/ph/caret-up-down';
	import IconGuide from '~icons/ph/book-open-text';
	import IconLogout from '~icons/ph/sign-out';
	import IconUser from '~icons/ph/user-circle';

	import type { User } from '$features/auth';

	interface Props {
		user: User;
		collapsed: boolean;
		accountHref: string;
		/** Menutup sidebar mobile setelah berpindah halaman. */
		onNavigate: () => void;
		/** Membuka konfirmasi keluar — keluar tetap lewat `ConfirmDialog`. */
		onLogout: () => void;
	}

	let { user, collapsed, accountHref, onNavigate, onLogout }: Props = $props();

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const initials = $derived(getInitials(user.name));

	const ITEM_CLASS =
		'flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text-secondary outline-none transition-colors data-highlighted:bg-surface-overlay data-highlighted:text-text-primary';
</script>

{#snippet avatar(sizeClass: string)}
	<div
		class={`flex shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-overlay font-sans text-xs leading-none font-semibold text-text-subtle ${sizeClass}`}
		aria-hidden="true"
	>
		{initials}
	</div>
{/snippet}

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label={`Menu akun ${user.name}`}
		title={collapsed ? user.name : undefined}
		class={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors outline-none hover:bg-surface-overlay focus-visible:ring-2 focus-visible:ring-brand-primary-strong/40 data-[state=open]:bg-surface-overlay ${
			collapsed ? 'justify-center' : 'w-full'
		}`}
	>
		{@render avatar('size-9')}
		{#if !collapsed}
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="truncate font-sans text-[13px] font-medium text-text-primary">
					{user.name}
				</span>
				<span class="truncate font-sans text-[11px] text-text-muted">{user.role}</span>
			</div>
			<IconCaretUpDown class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
		{/if}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<!--
			Pemicunya di dasar sidebar, jadi menu membuka ke atas; saat sidebar
			ciut ke rail 72px, ke kanan supaya tidak terpotong tepi layar.
		-->
		<DropdownMenu.Content
			side={collapsed ? 'right' : 'top'}
			align={collapsed ? 'end' : 'start'}
			sideOffset={8}
			class="z-200 w-60 rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-overlay outline-none"
		>
			<div class="flex items-center gap-2.5 px-3 py-2.5">
				{@render avatar('size-8')}
				<div class="flex min-w-0 flex-col">
					<span class="truncate text-sm font-medium text-text-primary">{user.name}</span>
					<span class="truncate text-xs text-text-muted">
						{user.email || user.username} · {user.role}
					</span>
				</div>
			</div>

			<DropdownMenu.Separator class="my-1 h-px bg-surface-overlay" />

			<DropdownMenu.Item onSelect={onNavigate}>
				{#snippet child({ props })}
					<a {...props} href={accountHref} class={ITEM_CLASS}>
						<IconUser class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
						Profil Saya
					</a>
				{/snippet}
			</DropdownMenu.Item>

			<DropdownMenu.Item onSelect={onNavigate}>
				{#snippet child({ props })}
					<a {...props} href="/dashboard/panduan" class={ITEM_CLASS}>
						<IconGuide class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
						Panduan
					</a>
				{/snippet}
			</DropdownMenu.Item>

			<DropdownMenu.Separator class="my-1 h-px bg-surface-overlay" />

			<DropdownMenu.Item
				onSelect={onLogout}
				class={`${ITEM_CLASS} text-status-danger-strong data-highlighted:bg-status-danger-soft data-highlighted:text-status-danger-strong`}
			>
				<IconLogout class="size-4 shrink-0" aria-hidden="true" />
				Keluar
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
