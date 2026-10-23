import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAILY_ROW_FILTERS, type DailyRowFilter, type DailyZoneFilter } from '../presentation';
import DailyViewModeMenu from './DailyViewModeMenu.svelte';

function renderMenu(zone: DailyZoneFilter = 'semua', row: DailyRowFilter = 'semua') {
	const onChange = vi.fn();
	render(DailyViewModeMenu, { props: { zone, row, rowOptions: DAILY_ROW_FILTERS, onChange } });
	return { onChange };
}

/** Lihat `ProfileMenu.svelte.test.ts`: Enter, bukan klik, supaya menu tidak langsung tertutup. */
async function openMenu(name: RegExp | string) {
	await fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
	await screen.findByRole('menu');
}

afterEach(async () => {
	const menu = document.querySelector('[role="menu"]');
	if (menu) await fireEvent.keyDown(menu, { key: 'Escape' });
});

describe('menu mode tampilan Hidrologi Harian', { timeout: 30_000 }, () => {
	it('pemicu bertuliskan Mode saat mode bawaan, dan menandai pilihan yang berlaku', async () => {
		renderMenu();

		const trigger = screen.getByRole('button', { name: 'Mode tampilan' });
		expect(trigger).toHaveTextContent('Mode');

		await openMenu('Mode tampilan');
		expect(screen.getAllByRole('menuitemradio', { name: 'Semua' })).toHaveLength(2);
		expect(screen.queryByRole('menuitem', { name: 'Tampilkan semua' })).not.toBeInTheDocument();
	});

	it('memilih zona memanggil onChange dengan zona saja', async () => {
		const { onChange } = renderMenu();

		await openMenu('Mode tampilan');
		await fireEvent.click(screen.getByRole('menuitemradio', { name: 'Hulu' }));

		expect(onChange).toHaveBeenCalledWith({ zone: 'hulu' });
	});

	it('mode aktif tampil di pemicu dan bisa dikembalikan sekaligus', async () => {
		const { onChange } = renderMenu('hulu', 'ringkas');

		const trigger = screen.getByRole('button', { name: 'Mode tampilan: Hulu, Ringkas' });
		expect(trigger).toHaveTextContent('Hulu · Ringkas');

		await openMenu(/Mode tampilan: Hulu/);
		await fireEvent.click(screen.getByRole('menuitem', { name: 'Tampilkan semua' }));

		expect(onChange).toHaveBeenCalledWith({ zone: 'semua', row: 'semua' });
	});
});
