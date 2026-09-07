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

let toastCounter = 0;

class NotificationStore {
	toasts = $state<ToastMessage[]>([]);

	addToast(toast: Omit<ToastMessage, 'id' | 'createdAt'>): void {
		const id = `toast-${++toastCounter}`;
		const newToast: ToastMessage = {
			...toast,
			id,
			duration: toast.duration ?? DEFAULT_TOAST_DURATION,
			createdAt: new Date().toISOString()
		};

		this.toasts = [...this.toasts, newToast];

		// Auto-remove after duration
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, newToast.duration);
	}

	removeToast(id: string): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const notificationStore = new NotificationStore();
