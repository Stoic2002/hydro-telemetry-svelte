import { authStore } from '../features/auth';

/**
 * SSR dan prerender dimatikan untuk seluruh aplikasi.
 *
 * Setiap halaman butuh token sesi dan memanggil backend yang alamatnya hanya
 * dikenal di sisi klien, jadi tidak ada satu pun rute yang bisa dirender lebih
 * awal. Menyetelnya di root membuat tidak ada halaman baru yang tanpa sengaja
 * lolos dengan SSR menyala.
 */
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'never';

/**
 * Pemulihan sesi diselesaikan di sini, sebelum rute mana pun dirender.
 *
 * Di versi React tugas ini dipegang `AuthBootstrap` yang menahan render sampai
 * `isInitialized`. Menaruhnya di `load` root membuat seluruh guard di bawahnya
 * bisa membaca status auth secara sinkron — tidak ada lagi jendela waktu ketika
 * halaman terlindungi sempat dirender sebelum status sesi diketahui.
 */
export const load = async () => {
	await authStore.initialize();
};
