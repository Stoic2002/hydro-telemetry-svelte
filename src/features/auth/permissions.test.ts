import { describe, expect, it } from 'vitest';
import type { User, UserRole } from './model';
import {
	canAccessDataTools,
	canEditHydrologyData,
	canManageUsers,
	canUploadMonthlyHydrology
} from './permissions';

function userWithRole(role: UserRole): User {
	return {
		id: 'user-1',
		name: 'Budi Santoso',
		username: 'budi.santoso',
		email: 'budi@example.com',
		role,
		accessPLTA: [],
		status: 'Aktif'
	};
}

describe('permissions', () => {
	it('hanya mengizinkan admin mengelola user', () => {
		expect(canManageUsers(userWithRole('Super Admin'))).toBe(true);
		expect(canManageUsers(userWithRole('Admin UBP'))).toBe(true);
		expect(canManageUsers(userWithRole('Operator PLTA'))).toBe(false);
		expect(canManageUsers(userWithRole('Viewer'))).toBe(false);
	});

	it('menutup Input GHW dan Katalog Data untuk Viewer saja', () => {
		expect(canAccessDataTools(userWithRole('Super Admin'))).toBe(true);
		expect(canAccessDataTools(userWithRole('Operator PLTA'))).toBe(true);
		expect(canAccessDataTools(userWithRole('Viewer'))).toBe(false);
	});

	it('membuka unggah hidrologi bulanan untuk Operator PLTA dan Super Admin', () => {
		// Satu unggahan menimpa data seluruh PLTA sekaligus, jadi Viewer harus
		// tertutup di sini persis seperti di Input GHW.
		expect(canUploadMonthlyHydrology(userWithRole('Super Admin'))).toBe(true);
		expect(canUploadMonthlyHydrology(userWithRole('Operator PLTA'))).toBe(true);
		expect(canUploadMonthlyHydrology(userWithRole('Viewer'))).toBe(false);
	});

	it('hanya membuka isian hidrologi harian dan bulanan untuk non-Viewer', () => {
		expect(canEditHydrologyData(userWithRole('Super Admin'))).toBe(true);
		expect(canEditHydrologyData(userWithRole('Operator PLTA'))).toBe(true);
		expect(canEditHydrologyData(userWithRole('Viewer'))).toBe(false);
		expect(canEditHydrologyData(null)).toBe(false);
	});

	it('menolak akses saat profil sesi belum tersedia', () => {
		expect(canManageUsers(null)).toBe(false);
		expect(canAccessDataTools(null)).toBe(false);
		expect(canUploadMonthlyHydrology(null)).toBe(false);
	});
});
