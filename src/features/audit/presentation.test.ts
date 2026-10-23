import { describe, expect, it } from 'vitest';
import { uploadAuditActionLabel } from './presentation';

describe('label aksi riwayat unggahan', () => {
	it('menerjemahkan aksi kurva EVA, bukan menampilkan kunci backend', () => {
		expect(uploadAuditActionLabel('publish')).toBe('Publish');
		expect(uploadAuditActionLabel('ubah_status')).toBe('Ubah status');
		expect(uploadAuditActionLabel('upload')).toBe('Unggah');
	});

	it('merapikan aksi yang belum dikenal', () => {
		expect(uploadAuditActionLabel('hapus_kurva')).toBe('Hapus kurva');
	});
});
