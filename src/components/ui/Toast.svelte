<script lang="ts">
	import type { Component } from 'svelte';
	import { fly } from 'svelte/transition';
	import IconSuccess from '~icons/ph/check-circle-fill';
	import IconInfo from '~icons/ph/info-fill';
	import IconWarning from '~icons/ph/warning-fill';
	import IconX from '~icons/ph/x';
	import IconError from '~icons/ph/x-circle-fill';
	import type { ToastMessage } from '$shared/lib/notification.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';

	type ToastType = ToastMessage['type'];

	/**
	 * Kartu gelap ringkas — permukaan yang sama dengan tooltip grafik dan
	 * `InfoTip`: ikon status berwarna, pesan, tombol tutup. Desain ulang 12 Nov
	 * 2026 atas permintaan tim ("terlalu ramai"): lingkaran berhuruf, jam, dan
	 * garis hitung mundur dibuang. Warna status hanya di ikon.
	 */
	const TYPE_ICONS: Record<
		ToastType,
		{ icon: Component<{ class?: string; 'aria-hidden'?: 'true' }>; color: string }
	> = {
		// Varian terang token status: varian `-strong` dibuat untuk latar terang
		// dan tenggelam di atas `surface-inverse`.
		success: { icon: IconSuccess, color: 'text-status-success' },
		error: { icon: IconError, color: 'text-status-danger' },
		warning: { icon: IconWarning, color: 'text-status-warning' },
		info: { icon: IconInfo, color: 'text-brand-primary' }
	};

	/** Gerak masuk/keluar dimatikan untuk `prefers-reduced-motion`, seperti transisi lain. */
	const reducedMotion =
		typeof window !== 'undefined' && typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;
	const motion = { y: -8, duration: reducedMotion ? 0 : 150 };
</script>

{#if notificationStore.toasts.length > 0}
	<!--
		Tengah atas, bukan kanan bawah. Sheet masuk dari kanan dan tombol Simpan
		ada di footer kanan bawahnya: toast di pojok itu menutupi tombolnya
		(temuan QA T4, 4 Nov 2026). Di layar laptop posisi ini jatuh di kiri sheet
		(lebar 480px), jadi tidak menutupi tombol tutup di kepala sheet juga.
	-->
	<div
		class="pointer-events-none fixed top-4 left-1/2 z-300 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2"
	>
		{#each notificationStore.toasts as toast (toast.id)}
			{@const type = TYPE_ICONS[toast.type]}
			<!--
				Hitung mundur berhenti selama kursor atau fokus berada di toast,
				supaya pesannya bisa dibaca sampai habis (WCAG 2.2.1).
			-->
			<div
				in:fly={motion}
				out:fly={motion}
				onpointerenter={() => notificationStore.pauseToast(toast.id)}
				onpointerleave={() => notificationStore.resumeToast(toast.id)}
				onfocusin={() => notificationStore.pauseToast(toast.id)}
				onfocusout={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
					notificationStore.resumeToast(toast.id);
				}}
				role={toast.type === 'error' ? 'alert' : 'status'}
				aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
				class="pointer-events-auto flex max-w-[420px] min-w-[260px] items-start gap-2.5 rounded-xl bg-surface-inverse py-2.5 pr-2 pl-3.5 shadow-panel"
			>
				<type.icon class={`mt-px size-[18px] shrink-0 ${type.color}`} aria-hidden="true" />

				<div class="min-w-0 flex-1 py-px">
					<p class="text-[13px] leading-5 font-medium text-white">{toast.message}</p>
					{#if toast.description}
						<p class="mt-0.5 text-xs leading-5 text-text-on-inverse-muted">{toast.description}</p>
					{/if}
				</div>

				<button
					type="button"
					aria-label="Tutup notifikasi"
					onclick={() => notificationStore.removeToast(toast.id)}
					class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-on-inverse-muted transition-colors hover:bg-white/10 hover:text-white"
				>
					<IconX class="size-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
