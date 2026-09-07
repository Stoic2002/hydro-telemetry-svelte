<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		/**
		 * Menonaktifkan tombol selama aksi berjalan. Tidak ada spinner: pemanggil
		 * yang mengganti labelnya jadi "Menyimpan…", sesuai `docs/design-system.md`.
		 */
		isLoading?: boolean;
		leftIcon?: Snippet;
		rightIcon?: Snippet;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		isLoading = false,
		leftIcon,
		rightIcon,
		children,
		class: className = '',
		disabled,
		...rest
	}: Props = $props();

	// Tiga varian saja. Satu tombol primer per layar; sisanya ghost.
	const VARIANT_CLASS = {
		primary: 'btn-primary',
		ghost: 'btn-ghost',
		danger: 'btn-danger'
	} as const;

	const SIZE_CLASS = {
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	} as const;
</script>

<button
	class={`btn ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
	disabled={disabled || isLoading}
	{...rest}
>
	{#if leftIcon}
		<span class="shrink-0">{@render leftIcon()}</span>
	{/if}
	{@render children?.()}
	{#if rightIcon}
		<span class="shrink-0">{@render rightIcon()}</span>
	{/if}
</button>
