<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AlertDialog } from 'bits-ui';
	import Button from '../atoms/Button.svelte';

	type ConfirmDialogVariant = 'danger' | 'warning' | 'primary';

	interface Props {
		isOpen: boolean;
		title: string;
		description: Snippet;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: ConfirmDialogVariant;
		icon?: Snippet;
		isConfirming?: boolean;
		onConfirm: () => void;
		onClose: () => void;
	}

	/**
	 * Dialog konfirmasi untuk aksi destruktif (hapus, keluar). Memakai
	 * `AlertDialog`, bukan `Dialog`: perannya `alertdialog` dan tidak bisa
	 * ditutup dengan klik di luar — operator harus memilih salah satu tombol.
	 */
	let {
		isOpen,
		title,
		description,
		confirmLabel = 'Konfirmasi',
		cancelLabel = 'Batal',
		variant = 'danger',
		icon,
		isConfirming = false,
		onConfirm,
		onClose
	}: Props = $props();

	const variantStyles: Record<
		ConfirmDialogVariant,
		{ icon: string; button: 'danger' | 'primary' }
	> = {
		danger: { icon: 'bg-red-100 text-red-600', button: 'danger' },
		warning: { icon: 'bg-amber-100 text-amber-600', button: 'primary' },
		primary: { icon: 'bg-cyan-100 text-brand-primary-strong', button: 'primary' }
	};

	const styles = $derived(variantStyles[variant]);
</script>

<AlertDialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-100 bg-scrim" />

		<AlertDialog.Content
			escapeKeydownBehavior={isConfirming ? 'ignore' : 'close'}
			class="fixed top-1/2 left-1/2 z-100 w-[calc(100vw-2rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-dialog outline-none"
		>
			<div class={`flex size-11 items-center justify-center rounded-full ${styles.icon}`}>
				{#if icon}
					{@render icon()}
				{:else}
					<span aria-hidden="true" class="font-mono text-[18px] leading-none font-semibold">!</span>
				{/if}
			</div>

			<AlertDialog.Title class="mt-3.5 text-base font-semibold text-text-primary">
				{title}
			</AlertDialog.Title>

			<AlertDialog.Description
				class="mt-1.5 text-sm leading-relaxed text-text-muted [&_strong]:font-semibold [&_strong]:text-text-secondary"
			>
				{@render description()}
			</AlertDialog.Description>

			<div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="ghost"
					disabled={isConfirming}
					onclick={onClose}
					class="w-full sm:w-auto"
				>
					{cancelLabel}
				</Button>
				<Button
					type="button"
					variant={styles.button}
					isLoading={isConfirming}
					onclick={onConfirm}
					class="w-full sm:w-auto"
				>
					{isConfirming ? 'Memproses…' : confirmLabel}
				</Button>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
