<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'size'> {
		label?: string;
		error?: string;
		helperText?: string;
		leftIcon?: Snippet;
		rightIcon?: Snippet;
		/** `md` = kontrol standar, `sm` = kontrol filter kompak. */
		size?: 'md' | 'sm';
		/** Kelas untuk pembungkus, bukan untuk elemen input-nya. */
		class?: string;
		value?: string | number | null;
	}

	let {
		label,
		error,
		helperText,
		leftIcon,
		rightIcon,
		size = 'md',
		class: className = '',
		id,
		value = $bindable(),
		...rest
	}: Props = $props();

	// Bentuk dasar, fokus, dan keadaan nonaktif datang dari kelas `.field` di
	// `layout.css`. Yang ditambahkan di sini hanya ruang untuk ikon.
	const SIZE_CLASS = {
		md: 'h-10',
		sm: 'h-9 text-[13px]'
	} as const;

	const ICON_PADDING = {
		md: { left: 'pl-10', right: 'pr-10' },
		sm: { left: 'pl-9', right: 'pr-9' }
	} as const;

	const generatedId = $props.id();
	const inputId = $derived(id ?? `input-${generatedId}`);
	const messageId = $derived(`${inputId}-message`);
</script>

<div class={`flex w-full min-w-0 flex-col gap-1.5 ${className}`}>
	{#if label}
		<label for={inputId} class="field-label">{label}</label>
	{/if}

	<div class="relative flex min-w-0 items-center">
		{#if leftIcon}
			<div class="pointer-events-none absolute left-3 flex items-center text-text-muted">
				{@render leftIcon()}
			</div>
		{/if}

		<input
			id={inputId}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || helperText ? messageId : undefined}
			class={`field ${SIZE_CLASS[size]} ${error ? 'field-invalid' : ''} ${
				leftIcon ? ICON_PADDING[size].left : ''
			} ${rightIcon ? ICON_PADDING[size].right : ''}`}
			{...rest}
		/>

		{#if rightIcon}
			<div class="absolute right-3 flex items-center text-text-muted">
				{@render rightIcon()}
			</div>
		{/if}
	</div>

	{#if error}
		<span id={messageId} class="text-xs font-medium text-status-danger-strong">{error}</span>
	{:else if helperText}
		<span id={messageId} class="text-xs text-text-muted">{helperText}</span>
	{/if}
</div>
