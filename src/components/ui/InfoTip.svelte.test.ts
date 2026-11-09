import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import InfoTip from './InfoTip.svelte';

/**
 * Keterangan penjelas pindah ke tooltip (permintaan tim 9 Nov 2026). Yang
 * dikunci: tombolnya bernama untuk pembaca layar. Membuka lewat fokus keyboard
 * tidak bisa diuji di jsdom — bits-ui memeriksa `:focus-visible`, yang tidak
 * didukung jsdom — jadi itu dicek di browser.
 */
describe('InfoTip', () => {
	it('punya nama untuk pembaca layar dan tidak menampilkan isinya sebelum dipicu', () => {
		render(InfoTip, {
			props: { label: 'Keterangan akumulasi', text: 'Akumulasi = posisi bulan.' }
		});

		expect(screen.getByRole('button', { name: 'Keterangan akumulasi' })).toBeInTheDocument();
		expect(screen.queryByText('Akumulasi = posisi bulan.')).not.toBeInTheDocument();
	});
});
