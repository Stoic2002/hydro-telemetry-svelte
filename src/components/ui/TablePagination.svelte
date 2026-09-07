<script lang="ts">
	import IconCaretLeft from '~icons/ph/caret-left';
	import IconCaretRight from '~icons/ph/caret-right';

	interface Props {
		page: number;
		totalPages: number;
		total: number;
		pageSize: number;
		/** Satuan yang dibaca operator, misalnya "laporan" atau "pengguna". */
		itemLabel: string;
		isBusy?: boolean;
		onPrevious: () => void;
		onNext: () => void;
		class?: string;
	}

	let {
		page,
		totalPages,
		total,
		pageSize,
		itemLabel,
		isBusy = false,
		onPrevious,
		onNext,
		class: className = ''
	}: Props = $props();

	const NAV_CLASSES =
		'border-border-subtle bg-surface-raised text-text-secondary hover:bg-surface-overlay disabled:text-disabled disabled:hover:bg-surface-raised flex size-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed';

	const firstItem = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const lastItem = $derived(Math.min(page * pageSize, total));
</script>

<div
	class={`flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-base px-4 py-2.5 ${className}`}
>
	<span class="text-xs text-text-muted">
		Menampilkan {firstItem}–{lastItem} dari {total}
		{itemLabel}
	</span>
	<div class="flex shrink-0 gap-1.5">
		<button
			type="button"
			aria-label="Halaman sebelumnya"
			disabled={page <= 1 || isBusy}
			onclick={onPrevious}
			class={NAV_CLASSES}
		>
			<IconCaretLeft class="size-3.5" />
		</button>
		<button
			type="button"
			aria-label="Halaman berikutnya"
			disabled={page >= totalPages || isBusy}
			onclick={onNext}
			class={NAV_CLASSES}
		>
			<IconCaretRight class="size-3.5" />
		</button>
	</div>
</div>
