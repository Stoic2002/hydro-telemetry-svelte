import { describe, expect, it } from 'vitest';
import { auditQueryKeys } from './queries';

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function isCoveredBy(key: readonly unknown[], prefix: readonly unknown[]): boolean {
	return prefix.every((segment, index) => key[index] === segment);
}

/**
 * Regresi: unggahan berhasil tapi tabel "Riwayat" di bawah formulirnya masih
 * memperlihatkan keadaan sebelum unggahan.
 *
 * `invalidateUploadAudit` hanya menyebut kunci induk `uploads()`. Yang membuat
 * daftar berparameter ikut terambil ulang adalah bentuk kuncinya — parameter
 * harus jadi segmen terakhir, bukan disisipkan di tengah.
 */
describe('auditQueryKeys', () => {
	it('menempatkan daftar berparameter di bawah kunci uploads', () => {
		expect(
			isCoveredBy(auditQueryKeys.uploadList({ page: 1, limit: 10 }), auditQueryKeys.uploads())
		).toBe(true);
	});

	it('mencakup daftar yang tersaring per PLTA dan jenis', () => {
		// Panel di Input GHW menyaring `elevation_curve` + PLTA aktif; panel di
		// Upload menyaring `monthly_excel` lintas-PLTA. Keduanya harus ikut basi.
		for (const params of [
			{ page: 1, limit: 10, pltaId: PLTA_ID, kind: 'elevation_curve' as const },
			{ page: 1, limit: 10, kind: 'monthly_excel' as const },
			{ page: 1, limit: 10, kind: 'monthly_image' as const }
		]) {
			expect(isCoveredBy(auditQueryKeys.uploadList(params), auditQueryKeys.uploads())).toBe(true);
		}
	});

	it('membedakan daftar dengan saringan berbeda', () => {
		expect(auditQueryKeys.uploadList({ page: 1, limit: 10 })).not.toEqual(
			auditQueryKeys.uploadList({ page: 2, limit: 10 })
		);
	});
});
