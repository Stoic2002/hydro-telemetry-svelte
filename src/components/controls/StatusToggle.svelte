<script lang="ts">
	interface Props {
		isActive: boolean;
		onChange: (isActive: boolean) => void;
		label?: string;
		disabled?: boolean;
	}

	let { isActive, onChange, label = 'Status akun', disabled = false }: Props = $props();

	const statusLabel = $derived(isActive ? 'Aktif' : 'Nonaktif');
</script>

<div
	class="flex h-10 items-center justify-between gap-3 self-end rounded-lg border border-border-subtle px-3"
>
	<span class="text-sm text-text-secondary">{label}</span>
	<button
		type="button"
		role="switch"
		aria-checked={isActive}
		aria-label={`${label}: ${statusLabel}`}
		{disabled}
		onclick={() => onChange(!isActive)}
		class={`flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
			isActive
				? 'border-brand-primary-strong bg-brand-primary-strong text-white'
				: 'border-border-subtle bg-surface-overlay text-text-muted'
		}`}
	>
		<span
			class={`relative h-[18px] w-[34px] rounded-full ${isActive ? 'bg-surface-raised/35' : 'bg-disabled'}`}
		>
			<span
				class={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-surface-raised transition-transform ${
					isActive ? 'translate-x-4' : 'translate-x-0'
				}`}
			></span>
		</span>
		<span>{statusLabel}</span>
	</button>
</div>
