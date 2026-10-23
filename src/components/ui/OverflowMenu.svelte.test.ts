import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OverflowMenu from './OverflowMenu.svelte';

/** Lihat `ProfileMenu.svelte.test.ts`: dibuka dengan Enter, bukan klik. */
async function openMenu() {
	await fireEvent.keyDown(screen.getByRole('button', { name: 'Pengaturan lain' }), {
		key: 'Enter'
	});
	await screen.findByRole('menu');
}

afterEach(async () => {
	const menu = document.querySelector('[role="menu"]');
	if (menu) await fireEvent.keyDown(menu, { key: 'Escape' });
});

describe('menu ⋯', { timeout: 30_000 }, () => {
	it('pemicu ikon punya nama yang dibacakan, dan item memanggil aksinya', async () => {
		const onSelect = vi.fn();
		render(OverflowMenu, {
			props: { ariaLabel: 'Pengaturan lain', items: [{ label: 'Nama bidang', onSelect }] }
		});

		await openMenu();
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Nama bidang' }));

		expect(onSelect).toHaveBeenCalledTimes(1);
	});
});
