<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog } from 'bits-ui';
	import IconX from '~icons/ph/x';

	interface Props {
		isOpen: boolean;
		title: string;
		description?: Snippet;
		children: Snippet;
		footer?: Snippet;
		isDismissible?: boolean;
		onClose: () => void;
	}

	/**
	 * Panel geser dari kanan untuk form buat/ubah/query. Form tidak pernah jadi
	 * halaman tersendiri.
	 *
	 * Kunci fokus, kunci scroll halaman, tutup dengan Escape, dan pengembalian
	 * fokus ke pemicu ditangani `bits-ui`. Di versi React ketiganya ditulis
	 * tangan di `shared/lib/useFocusTrap.ts`; berkas itu tidak ikut diport
	 * karena sudah tidak ada yang memakainya.
	 */
	let {
		isOpen,
		title,
		description,
		children,
		footer,
		isDismissible = true,
		onClose
	}: Props = $props();
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-100 bg-scrim" />

		<Dialog.Content
			interactOutsideBehavior={isDismissible ? 'close' : 'ignore'}
			escapeKeydownBehavior={isDismissible ? 'close' : 'ignore'}
			class="fixed inset-y-0 right-0 z-100 flex h-full w-full max-w-[480px] flex-col border-l border-border-subtle bg-surface-raised shadow-[-12px_0_32px_rgb(0_0_0/10%)] outline-none"
		>
			<header
				class="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4"
			>
				<div class="min-w-0 flex-1">
					<Dialog.Title class="text-base font-semibold tracking-[-0.01em] text-text-primary">
						{title}
					</Dialog.Title>
					{#if description}
						<Dialog.Description class="mt-1 text-sm leading-normal text-text-muted">
							{@render description()}
						</Dialog.Description>
					{/if}
				</div>

				<Dialog.Close
					aria-label="Tutup panel"
					disabled={!isDismissible}
					class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
				>
					<IconX class="size-3.5" />
				</Dialog.Close>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
				{@render children()}
			</div>

			{#if footer}
				<footer class="border-t border-border-subtle px-5 py-3.5">
					{@render footer()}
				</footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
