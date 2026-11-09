import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Input from './Input.svelte';

/**
 * Keterangan penjelas pindah dari teks di bawah field ke tooltip di samping
 * label (keputusan tim 9 Nov 2026). Galat validasi tetap tertulis.
 */
describe('Input', () => {
	it('menaruh hint di tooltip, bukan sebagai teks di bawah field', () => {
		render(Input, { props: { label: 'Kode', hint: 'Huruf besar, angka, dan tanda hubung.' } });

		expect(screen.getByLabelText('Kode')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Keterangan Kode' })).toBeInTheDocument();
		expect(screen.queryByText('Huruf besar, angka, dan tanda hubung.')).not.toBeInTheDocument();
	});

	it('galat tetap tertulis dan dibacakan bersama field', () => {
		render(Input, { props: { label: 'Kode', hint: 'Format kode.', error: 'Isi kode.' } });

		expect(screen.getByLabelText('Kode')).toHaveAccessibleDescription('Isi kode.');
	});
});
