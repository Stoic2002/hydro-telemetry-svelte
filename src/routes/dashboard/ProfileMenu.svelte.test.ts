import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '$features/auth';
import ProfileMenu from './ProfileMenu.svelte';

const USER: User = {
	id: 'u-1',
	name: 'Budi Santoso',
	username: 'budi',
	email: 'budi@example.com',
	role: 'Operator PLTA',
	accessPLTA: [],
	status: 'Aktif'
};

function renderMenu(collapsed = false) {
	const onNavigate = vi.fn();
	const onLogout = vi.fn();
	render(ProfileMenu, {
		props: {
			user: USER,
			collapsed,
			accountHref: '/dashboard/plta/p-1/account',
			onNavigate,
			onLogout
		}
	});
	return { onNavigate, onLogout };
}

/**
 * Dibuka dengan Enter lewat keyboard — sekaligus memastikan menu terjangkau
 * tanpa mouse. `fireEvent`, bukan `userEvent`: userEvent mengirim keydown
 * disusul click, dan click itu langsung menutup lagi menu yang baru terbuka.
 */
async function openMenu() {
	await fireEvent.keyDown(screen.getByRole('button', { name: 'Menu akun Budi Santoso' }), {
		key: 'Enter'
	});
	await screen.findByRole('menu');
}

// Menu yang masih terbuka saat komponen dilepas meninggalkan state lapisan
// bits-ui, dan menu di test berikutnya tidak pernah muncul. Ditutup dulu
// sebelum cleanup global di `src/test/setup.ts` berjalan.
afterEach(async () => {
	const menu = document.querySelector('[role="menu"]');
	if (menu) await fireEvent.keyDown(menu, { key: 'Escape' });
});

// Merender menu bits-ui di jsdom makan 4–11 detik per test di mesin dev, jauh
// di atas batas bawaan 5 detik — bukan macet, hanya lambat.
describe('menu akun di sidebar', { timeout: 30_000 }, () => {
	it('membuka menu berisi profil, panduan, dan keluar', async () => {
		renderMenu();

		await openMenu();

		expect(screen.getByRole('menuitem', { name: 'Profil Saya' })).toHaveAttribute(
			'href',
			'/dashboard/plta/p-1/account'
		);
		expect(screen.getByRole('menuitem', { name: 'Panduan' })).toHaveAttribute(
			'href',
			'/dashboard/panduan'
		);
		expect(screen.getByText('budi@example.com · Operator PLTA')).toBeInTheDocument();
	});

	it('meneruskan Keluar ke konfirmasi, bukan langsung memutus sesi', async () => {
		const { onLogout } = renderMenu();

		await openMenu();
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Keluar' }));

		expect(onLogout).toHaveBeenCalledOnce();
	});

	it('tetap menyebut nama pengguna saat sidebar ciut', () => {
		renderMenu(true);

		expect(screen.getByRole('button', { name: 'Menu akun Budi Santoso' })).toBeInTheDocument();
		expect(screen.queryByText('Operator PLTA')).not.toBeInTheDocument();
	});
});
