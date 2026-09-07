<script lang="ts" generics="T extends string | number">
	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		value: T;
		onChange: (value: T) => void;
		options: Option[];
		ariaLabel: string;
	}

	let { value, onChange, options, ariaLabel }: Props = $props();
</script>

<div
	role="radiogroup"
	aria-label={ariaLabel}
	class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-overlay p-1"
>
	{#each options as option (String(option.value))}
		{@const isActive = option.value === value}
		<button
			type="button"
			role="radio"
			aria-checked={isActive}
			onclick={() => onChange(option.value)}
			class={`flex h-8 cursor-pointer items-center rounded-md px-3.5 text-sm whitespace-nowrap transition-colors ${
				isActive
					? 'border border-border-subtle bg-surface-raised font-semibold text-brand-primary-strong'
					: 'border border-transparent font-medium text-text-subtle hover:text-text-primary'
			}`}
		>
			{option.label}
		</button>
	{/each}
</div>
