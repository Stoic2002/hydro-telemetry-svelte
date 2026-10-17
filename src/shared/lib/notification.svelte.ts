/**
 * Bentuk satu toast. Ikut pindah ke sini bersama pembongkaran
 * `src/types/index.ts`: tipe ini hanya dipakai store ini dan komponen yang
 * merendernya, dan `shared` tidak boleh mengimpor `features`.
 */
export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	description?: string;
	duration?: number;
	/** Diisi store saat toast dibuat, ditampilkan sebagai jam WIB. */
	createdAt: string;
}

/**
 * Notifikasi global. Pengganti store Zustand di versi React.
 *
 * Tinggal di `shared/lib` karena dipakai lintas fitur — hidrologi, unggahan
 * telemetri, manajemen pengguna — jadi ia infrastruktur UI bersama, bukan milik
 * satu domain.
 *
 * Bentuknya kelas dengan field `$state` alih-alih `create()` dari Zustand:
 * pembacaan `notificationStore.toasts` sudah reaktif dengan sendirinya, jadi
 * tidak perlu lagi selector seperti `useNotificationStore((s) => s.toasts)`.
 */

export const DEFAULT_TOAST_DURATION = 4000;

/**
 * Galat bertahan dua kali lebih lama: isinya biasanya kalimat yang harus
 * dibaca sampai habis (apa yang gagal dan apa yang perlu dilakukan), dan dulu
 * keburu hilang dalam 4 detik.
 */
export const ERROR_TOAST_DURATION = 8000;

let toastCounter = 0;

interface ToastTimer {
	handle: ReturnType<typeof setTimeout> | undefined;
	startedAt: number;
	remaining: number;
}

class NotificationStore {
	toasts = $state<ToastMessage[]>([]);
	/** Toast yang hitung mundurnya sedang dijeda (kursor atau fokus di atasnya). */
	pausedIds = $state<string[]>([]);

	#timers = new Map<string, ToastTimer>();

	addToast(toast: Omit<ToastMessage, 'id' | 'createdAt'>): void {
		const id = `toast-${++toastCounter}`;
		const newToast: ToastMessage = {
			...toast,
			id,
			duration:
				toast.duration ?? (toast.type === 'error' ? ERROR_TOAST_DURATION : DEFAULT_TOAST_DURATION),
			createdAt: new Date().toISOString()
		};

		this.toasts = [...this.toasts, newToast];
		this.#schedule(id, newToast.duration ?? DEFAULT_TOAST_DURATION);
	}

	removeToast(id: string): void {
		const timer = this.#timers.get(id);
		clearTimeout(timer?.handle);
		this.#timers.delete(id);
		this.pausedIds = this.pausedIds.filter((pausedId) => pausedId !== id);
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/** Menahan toast selama dibaca — WCAG 2.2.1, batas waktu harus bisa dijeda. */
	pauseToast(id: string): void {
		const timer = this.#timers.get(id);
		if (!timer?.handle) return;
		clearTimeout(timer.handle);
		timer.remaining = Math.max(timer.remaining - (Date.now() - timer.startedAt), 0);
		timer.handle = undefined;
		this.pausedIds = [...this.pausedIds, id];
	}

	resumeToast(id: string): void {
		const timer = this.#timers.get(id);
		if (!timer || timer.handle) return;
		this.pausedIds = this.pausedIds.filter((pausedId) => pausedId !== id);
		this.#schedule(id, timer.remaining);
	}

	#schedule(id: string, remaining: number): void {
		this.#timers.set(id, {
			handle: setTimeout(() => this.removeToast(id), remaining),
			startedAt: Date.now(),
			remaining
		});
	}
}

export const notificationStore = new NotificationStore();
