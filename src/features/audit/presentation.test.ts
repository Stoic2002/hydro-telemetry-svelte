import { describe, expect, it } from 'vitest';
import type { UploadAuditEntry } from './model';
import { uploadAuditActionLabel, uploadAuditKindLabel, uploadAuditSubject } from './presentation';

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

describe('riwayat gambar hujan (temuan QA T18)', () => {
	const entry = (patch: Partial<UploadAuditEntry>): UploadAuditEntry => ({
		id: 'a1',
		createdAt: '2026-11-13T08:00:00+07:00',
		kind: 'monthly_image',
		action: 'upload',
		userId: null,
		username: 'admin',
		pltaId: null,
		pltaCode: null,
		parameter: null,
		station: null,
		fileName: 'sifat-nov.png',
		count: 1,
		periodStart: null,
		periodEnd: null,
		details: null,
		...patch
	});

	it('menyebut jenis gambarnya di depan nama berkas', () => {
		expect(uploadAuditSubject(entry({ parameter: 'prediksi_sifat_hujan' }))).toBe(
			'Prediksi Sifat Hujan · sifat-nov.png'
		);
		expect(uploadAuditSubject(entry({ details: { jenis: 'realisasi_curah_hujan' } }))).toBe(
			'Realisasi Curah Hujan · sifat-nov.png'
		);
	});

	it('tanpa jenis yang dikenali, tetap nama berkas', () => {
		expect(uploadAuditSubject(entry({}))).toBe('sifat-nov.png');
		expect(
			uploadAuditSubject(entry({ kind: 'monthly_excel', parameter: 'prediksi_sifat_hujan' }))
		).toBe('sifat-nov.png');
	});

	it('jalurnya bernama "Gambar hujan", bukan "Prakiraan hujan"', () => {
		expect(uploadAuditKindLabel('monthly_image')).toBe('Gambar hujan');
	});
});
