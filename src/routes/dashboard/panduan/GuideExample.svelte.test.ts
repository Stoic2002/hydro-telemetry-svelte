import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GuideExample from './GuideExample.svelte';
import { GUIDE_CHAPTERS } from './guide';

/**
 * Contoh panduan merender komponen asli dengan data contoh. Kalau props sebuah
 * komponen berubah, contoh di sini bisa gagal dirender tanpa typecheck
 * menangkapnya (mis. nilai yang lolos tipe tapi tidak lolos logika komponen) —
 * dan operator hanya melihat halaman panduan yang rusak.
 */

const exampleIds = GUIDE_CHAPTERS.flatMap((chapter) =>
	chapter.blocks.flatMap((block) => (block.example ? [block.example] : []))
);

describe('contoh tampilan panduan', () => {
	it('tidak memakai contoh yang sama dua kali', () => {
		expect(exampleIds.length).toBeGreaterThan(0);
		expect(new Set(exampleIds).size).toBe(exampleIds.length);
	});

	it.each(exampleIds)('merender contoh "%s" tanpa galat', (id) => {
		const { container } = render(GuideExample, { props: { id } });

		expect(screen.getByText('Contoh tampilan')).toBeInTheDocument();
		// Isi contoh tidak boleh bisa difokus atau diklik operator.
		expect(container.querySelector('[inert]')?.childElementCount).toBeGreaterThan(0);
	});
});
