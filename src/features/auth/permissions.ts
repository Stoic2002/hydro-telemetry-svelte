import type { User } from './model';

/**
 * Satu sumber aturan role untuk guard route dan visibilitas menu. Sebelumnya
 * kedua tempat itu menuliskan perbandingan role sendiri-sendiri, sehingga menu
 * bisa disembunyikan tanpa route-nya ikut terjaga.
 *
 * Catatan: backend hanya mengenal `admin`, `operator`, dan `viewer`
 * (`features/auth/api/schemas.ts`). Nilai `Admin UBP` masih diikutkan agar
 * perilaku persis sama seperti sebelumnya, walau tidak ada mapper yang bisa
 * menghasilkannya — belum ada keputusan untuk membuangnya.
 */

export function canManageUsers(user: User | null): boolean {
	return user?.role === 'Super Admin' || user?.role === 'Admin UBP';
}

/** Upload (termasuk Input EVA) dan Katalog Data: seluruh role kecuali Viewer. */
export function canAccessDataTools(user: User | null): boolean {
	return user !== null && user.role !== 'Viewer';
}

/**
 * Mengisi dan mengubah data Hidrologi Harian dan Bulanan (tombol "Input data" /
 * "Edit data"). Viewer hanya membaca. Diberi nama sendiri karena dipakai di
 * halaman baca yang sama dengan Viewer — bukan menu tersendiri seperti Upload —
 * sehingga yang disaring adalah tombolnya, bukan rutenya.
 */
export function canEditHydrologyData(user: User | null): boolean {
	return canAccessDataTools(user);
}

/**
 * Menyetel batas kelayakan pembacaan satu tag (Katalog Data). Efeknya server-
 * wide: pembacaan di luar rentang ditandai `impossible` dan keluar dari
 * parameter turunan, agregat, dan akurasi. Aturannya kebetulan sama dengan
 * `canAccessDataTools` — Swagger menyebutnya kegiatan operasional — tetapi
 * diberi nama sendiri supaya bisa dibatasi tanpa menyentuh menu.
 */
export function canEditTagBounds(user: User | null): boolean {
	return canAccessDataTools(user);
}

/**
 * Unggah ringkasan hidrologi bulanan: Operator PLTA dan Super Admin.
 * Aturannya kebetulan sama dengan `canAccessDataTools`, tapi sengaja diberi
 * nama sendiri — satu unggahan menimpa data seluruh PLTA sekaligus, jadi kalau
 * suatu saat dibatasi hanya admin, perubahannya cukup di satu tempat ini.
 */
export function canUploadMonthlyHydrology(user: User | null): boolean {
	return canAccessDataTools(user);
}

/**
 * Mengatur daftar Tren & Grafik satu PLTA (`PUT /trends/plta/{id}/series`) dan
 * mengganti nama metrik/bidang hidrologi. Swagger menyebut keduanya **khusus
 * admin**, jadi aturannya sama dengan User Management.
 */
export function canConfigureDisplay(user: User | null): boolean {
	return canManageUsers(user);
}
