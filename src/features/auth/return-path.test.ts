import { describe, expect, it } from 'vitest';
import { loginPath, safeReturnPath } from './return-path';

describe('alamat kembali sesudah login', () => {
	it.each([
		'/dashboard/plta/abc/telemetering/harian?units=1',
		'/dashboard',
		'/dashboard?x=1',
		'/dashboard/overview#peta'
	])('menerima alamat dashboard %s', (path) => {
		expect(safeReturnPath(path)).toBe(path);
	});

	it.each([
		null,
		'',
		'https://contoh.test/dashboard',
		'//contoh.test/dashboard',
		'/\\contoh.test',
		'/dashboardpalsu',
		'/login',
		'dashboard'
	])('menolak %s dan jatuh ke /dashboard', (path) => {
		expect(safeReturnPath(path)).toBe('/dashboard');
	});

	it('tidak membawa /dashboard polos karena itu tujuan bawaan', () => {
		expect(loginPath(new URL('http://app.test/dashboard'))).toBe('/login');
	});

	it('menambahkan penanda sesi habis', () => {
		expect(loginPath(new URL('http://app.test/dashboard/catalog'), { expired: true })).toBe(
			'/login?kembali=%2Fdashboard%2Fcatalog&sesi=habis'
		);
	});
});
