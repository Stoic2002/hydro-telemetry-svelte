<script lang="ts" module>
	export interface SelectOption {
		value: string;
		label: string;
		disabled?: boolean;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Select } from 'bits-ui';
	import IconCaretDown from '~icons/ph/caret-down';
	import IconCheck from '~icons/ph/check';

	interface Props {
		label?: string;
		error?: string;
		helperText?: string;
		options: SelectOption[];
		leadingIcon?: Snippet;
		controlSize?: 'sm' | 'md';
		disabled?: boolean;
		required?: boolean;
		/** Nama untuk input tersembunyi — hanya perlu bila select ikut submit form. */
		name?: string;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
		controlClass?: string;
		value?: string;
		/** Dipanggil setelah nilai berubah — untuk efek samping seperti reset halaman. */
		onValueChange?: (value: string) => void;
	}

	let {
		label,
		error,
		helperText,
		options,
		leadingIcon,
		controlSize = 'md',
		disabled = false,
		required = false,
		name,
		placeholder = 'Pilih opsi',
		ariaLabel,
		class: className = '',
		controlClass = '',
		value = $bindable(''),
		onValueChange
	}: Props = $props();

	/**
	 * Seluruh perilaku dropdown — portal, kunci fokus, navigasi panah, Home/End,
	 * typeahead, dan penutupan saat klik di luar — ditangani `bits-ui`. Di versi
	 * React semua itu ditulis tangan (±300 baris) karena tidak ada primitif yang
	 * setara.
	 */

	const isCompact = $derived(controlSize === 'sm');
	const generatedId = $props.id();
	const triggerId = $derived(`select-${generatedId}-trigger`);
	const messageId = $derived(`select-${generatedId}-message`);
	const selectedLabel = $derived(options.find((option) => option.value === value)?.label);
</script>

<div class={`flex w-full min-w-0 flex-col gap-1.5 ${className}`}>
	{#if label}
		<label for={triggerId} class="field-label">{label}</label>
	{/if}

	<Select.Root
		type="single"
		bind:value
		{onValueChange}
		items={options}
		{disabled}
		{required}
		{name}
	>
		<Select.Trigger
			id={triggerId}
			aria-label={label ? undefined : ariaLabel}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || helperText ? messageId : undefined}
			class={`field relative flex cursor-pointer items-center ${
				isCompact ? 'h-9 pr-8 text-[13px]' : 'h-10 pr-10'
			} ${leadingIcon ? (isCompact ? 'pl-9' : 'pl-10') : ''} ${
				error ? 'field-invalid' : ''
			} ${controlClass}`}
		>
			{#if leadingIcon}
				<span
					aria-hidden="true"
					class={`pointer-events-none absolute left-3 text-text-muted ${
						isCompact ? '[&>svg]:size-3.5' : '[&>svg]:size-4'
					}`}
				>
					{@render leadingIcon()}
				</span>
			{/if}

			<span
				class={`min-w-0 flex-1 truncate text-left ${selectedLabel ? '' : 'text-text-placeholder'}`}
			>
				{selectedLabel ?? placeholder}
			</span>

			<span
				aria-hidden="true"
				class={`pointer-events-none absolute flex items-center justify-center text-text-muted ${
					isCompact ? 'right-3' : 'right-3.5'
				}`}
			>
				<IconCaretDown class={isCompact ? 'size-3.5' : 'size-4'} />
			</span>
		</Select.Trigger>

		<Select.Portal>
			<!--
				`side="bottom"` dipatok, bukan dibiarkan otomatis membalik ke atas:
				panel dropdown harus muncul di bawah field dan tidak menutupinya.
			-->
			<Select.Content
				side="bottom"
				align="start"
				sideOffset={8}
				class="z-200 w-[var(--bits-select-anchor-width)] overflow-hidden rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-panel outline-none"
			>
				<Select.Viewport
					class="max-h-[min(320px,var(--bits-select-content-available-height))] overflow-x-hidden overflow-y-auto"
				>
					{#each options as option (option.value)}
						<Select.Item
							value={option.value}
							label={option.label}
							disabled={option.disabled}
							class="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors outline-none data-disabled:cursor-not-allowed data-disabled:text-disabled data-highlighted:bg-surface-overlay data-highlighted:text-text-primary data-selected:bg-brand-tint data-selected:font-medium data-selected:text-brand-primary-pressed"
						>
							{#snippet children({ selected })}
								<span class="min-w-0 flex-1 truncate">{option.label}</span>
								{#if selected}
									<IconCheck class="size-4 shrink-0" />
								{/if}
							{/snippet}
						</Select.Item>
					{/each}
				</Select.Viewport>
			</Select.Content>
		</Select.Portal>
	</Select.Root>

	{#if error || helperText}
		<span
			id={messageId}
			class={`text-[11.5px] font-medium ${error ? 'text-status-danger-strong' : 'text-text-muted'}`}
		>
			{error || helperText}
		</span>
	{/if}
</div>
