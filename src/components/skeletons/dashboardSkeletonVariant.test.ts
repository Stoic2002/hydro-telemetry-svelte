import { describe, expect, it } from 'vitest';
import { getDashboardSkeletonVariant } from './dashboardSkeletonVariant';

/**
 * Bentuk skeleton dipilih dari pathname tujuan, dan rute sempat berpindah dua
 * kali: Upload keluar dari Telemetering, lalu Rekap Hidrologi masuk ke bawahnya.
 * Urutan pemeriksaannya penting — `/dashboard/upload` dan
 * `/dashboard/telemetering/rekap` sama-sama akan cocok dengan aturan yang lebih
 * umum bila diperiksa belakangan.
 */
describe('bentuk skeleton per halaman', () => {
	it.each([
		['/dashboard/overview', 'overview'],
		['/dashboard/plta/abc/telemetering/harian', 'telemetering'],
		['/dashboard/plta/abc/telemetering/bulanan', 'telemetering'],
		['/dashboard/plta/abc/trends', 'trends'],
		['/dashboard/plta/abc/forecasting', 'forecasting'],
		['/dashboard/plta/abc/laporan', 'table'],
		['/dashboard/catalog', 'table'],
		['/dashboard/plta/abc/user-management', 'table'],
		['/dashboard/plta/abc/account', 'form'],
		['/dashboard/panduan', 'default']
	])('%s → %s', (pathname, variant) => {
		expect(getDashboardSkeletonVariant(pathname)).toBe(variant);
	});

	it('memakai bentuk dropzone untuk menu Upload dan alamat lamanya', () => {
		expect(getDashboardSkeletonVariant('/dashboard/upload')).toBe('upload');
		expect(getDashboardSkeletonVariant('/dashboard/telemetering/upload')).toBe('upload');
		expect(getDashboardSkeletonVariant('/dashboard/plta/abc/input-ghw')).toBe('upload');
	});

	it('tidak memakai bentuk panel parameter untuk Rekap Hidrologi', () => {
		// Isinya ringkasan dan daftar unduhan, bukan tiga kartu zona.
		expect(getDashboardSkeletonVariant('/dashboard/telemetering/rekap')).toBe('default');
	});
});
