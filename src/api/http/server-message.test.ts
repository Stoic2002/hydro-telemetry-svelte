import { describe, expect, it } from 'vitest';
import { localizeServerMessage, statusFallbackMessage } from './server-message';

describe('pesan server berbahasa Inggris (temuan QA T18)', () => {
	it('mengganti potongan bahasa Inggris yang dikenal, mempertahankan sisanya', () => {
		expect(
			localizeServerMessage('Berkas tidak terbaca sebagai Excel: File is not a zip file')
		).toBe(
			'Berkas tidak terbaca sebagai Excel: berkas bukan .xlsx yang sah (mungkin .xls lama, .csv yang diganti namanya, atau berkas rusak)'
		);
		expect(localizeServerMessage("Worksheet named 'DATA' not found")).toBe(
			"lembar kerja 'DATA' tidak ditemukan"
		);
	});

	it('pesan yang sudah berbahasa Indonesia tidak disentuh', () => {
		expect(localizeServerMessage('Kode PLTA sudah dipakai')).toBe('Kode PLTA sudah dipakai');
	});

	it('teks status HTTP diganti kalimat operator', () => {
		expect(statusFallbackMessage(409)).toBe('Data bertabrakan dengan yang sudah ada');
		expect(statusFallbackMessage(418)).toBeUndefined();
	});
});
