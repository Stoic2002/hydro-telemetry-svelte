import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_TOAST_DURATION,
	ERROR_TOAST_DURATION,
	notificationStore
} from './notification.svelte';

describe('notificationStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		for (const toast of notificationStore.toasts) notificationStore.removeToast(toast.id);
		vi.useRealTimers();
	});

	it('menahan galat lebih lama daripada toast biasa', () => {
		notificationStore.addToast({ type: 'success', message: 'Tersimpan' });
		notificationStore.addToast({ type: 'error', message: 'Gagal menyimpan' });

		vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
		expect(notificationStore.toasts.map((toast) => toast.message)).toEqual(['Gagal menyimpan']);

		vi.advanceTimersByTime(ERROR_TOAST_DURATION - DEFAULT_TOAST_DURATION);
		expect(notificationStore.toasts).toEqual([]);
	});

	it('tidak menutup toast selama dijeda, lalu melanjutkan sisa waktunya', () => {
		notificationStore.addToast({ type: 'info', message: 'Sedang dibaca' });
		const [toast] = notificationStore.toasts;

		vi.advanceTimersByTime(1000);
		notificationStore.pauseToast(toast.id);
		expect(notificationStore.pausedIds).toEqual([toast.id]);

		vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 3);
		expect(notificationStore.toasts).toHaveLength(1);

		notificationStore.resumeToast(toast.id);
		expect(notificationStore.pausedIds).toEqual([]);
		vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 1001);
		expect(notificationStore.toasts).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(notificationStore.toasts).toEqual([]);
	});
});
