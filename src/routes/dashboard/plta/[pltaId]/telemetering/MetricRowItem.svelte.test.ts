import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MetricRowItem from './MetricRowItem.svelte';
import type { MetricRow } from './presentation';

/**
 * Halaman Hidrologi Harian tidak meneruskan `onUpload` untuk Viewer. Yang
 * dikunci di sini: tanpa handler itu, tombol isian benar-benar tidak ada —
 * bukan sekadar nonaktif.
 */

const ROW: MetricRow = {
	label: 'TMA Waduk',
	value: '231,5',
	unit: 'm',
	source: 'Input',
	sourceType: 'input',
	hasData: true,
	uploadTarget: { label: 'TMA Waduk', parameter: 'reservoir', unit: 'm', tags: [] } as never
};

describe('tombol isian data harian', () => {
	it('tidak dirender tanpa handler unggah (Viewer)', () => {
		render(MetricRowItem, { props: { row: ROW } });

		expect(screen.queryByRole('button', { name: /data/i })).not.toBeInTheDocument();
	});

	it('dirender dan membuka isian bila handler tersedia', async () => {
		const onUpload = vi.fn();
		render(MetricRowItem, { props: { row: ROW, onUpload } });

		await userEvent.setup().click(screen.getByRole('button', { name: 'Edit data' }));

		expect(onUpload).toHaveBeenCalledWith(ROW.uploadTarget);
	});
});
