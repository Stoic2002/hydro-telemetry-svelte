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

/** Input GHW dan Katalog Data: seluruh role kecuali Viewer. */
export function canAccessDataTools(user: User | null): boolean {
	return user !== null && user.role !== 'Viewer';
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
