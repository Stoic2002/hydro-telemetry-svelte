<script lang="ts">
	import IconX from '~icons/ph/x';
	import type { ToastMessage } from '$shared/lib/notification.svelte';
	import { formatTimeWIB } from '../../shared/lib/date';
	import { DEFAULT_TOAST_DURATION, notificationStore } from '$shared/lib/notification.svelte';

	type ToastType = ToastMessage['type'];

	/**
	 * Penanda tipe memakai kosakata yang sama dengan `Banner` dan `ErrorState`:
	 * lingkaran bertint dengan glif mono di dalamnya. Warna tipe muncul dua kali —
	 * di glif dan di garis hitung mundur — dan tidak pernah sebagai pita hias.
	 */
	const TYPE_STYLES: Record<ToastType, { marker: string; glyph: string; countdown: string }> = {
		success: {
			marker: 'bg-status-success-soft text-status-success-strong',
			glyph: '✓',
			countdown: 'bg-status-success-strong'
		},
		error: {
			marker: 'bg-status-danger-soft text-status-danger-strong',
			glyph: '!',
			countdown: 'bg-status-danger-strong'
		},
		warning: {
			marker: 'bg-status-warning-soft text-status-warning-strong',
			glyph: '!',
			countdown: 'bg-status-warning-strong'
		},
		info: {
			marker: 'bg-brand-tint text-brand-primary-pressed',
			glyph: 'i',
			countdown: 'bg-status-info'
		}
	};
</script>

{#if notificationStore.toasts.length > 0}
	<div class="pointer-events-none fixed right-4 bottom-4 z-300 flex flex-col gap-2">
		{#each notificationStore.toasts as toast (toast.id)}
			{@const styles = TYPE_STYLES[toast.type]}
			<div
				role={toast.type === 'error' ? 'alert' : 'status'}
				aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
				class="pointer-events-auto relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border-subtle bg-surface-raised pt-3 pr-3 pb-3.5 pl-3.5 shadow-panel"
			>
				<div class="flex items-start gap-2.5">
					<span
						aria-hidden="true"
						class={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] leading-none font-medium ${styles.marker}`}
					>
						{styles.glyph}
					</span>

					<div class="min-w-0 flex-1">
						<div class="flex items-baseline gap-2">
							<p class="min-w-0 flex-1 text-sm leading-tight font-medium text-text-primary">
								{toast.message}
							</p>
							<time
								datetime={toast.createdAt}
								class="shrink-0 font-mono text-xs text-text-placeholder tabular-nums"
							>
								{formatTimeWIB(toast.createdAt)}
							</time>
						</div>
						{#if toast.description}
							<p class="mt-1 text-xs leading-relaxed text-text-muted">{toast.description}</p>
						{/if}
					</div>

					<button
						type="button"
						aria-label="Tutup notifikasi"
						onclick={() => notificationStore.removeToast(toast.id)}
						class="-mt-0.5 -mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-placeholder transition-colors hover:bg-surface-overlay hover:text-text-secondary"
					>
						<IconX class="size-3" />
					</button>
				</div>

				<span
					aria-hidden="true"
					style={`--toast-duration: ${toast.duration ?? DEFAULT_TOAST_DURATION}ms`}
					class={`toast-countdown absolute inset-x-0 bottom-0 h-0.5 ${styles.countdown}`}
				></span>
			</div>
		{/each}
	</div>
{/if}
