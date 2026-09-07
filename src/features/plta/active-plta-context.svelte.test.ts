import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ActivePLTAContextHarness from './ActivePLTAContext.test-harness.svelte';
import type { ActivePLTA } from './active-plta-context';
import type { Plant } from './model';

/**
 * Regresi: berpindah PLTA lewat PlantSwitcher hanya mengubah param `[pltaId]`.
 * Route id-nya tetap sama, jadi SvelteKit memperbarui `data` tanpa me-remount
 * halaman — blok `<script>` tidak dijalankan ulang.
 *
 * Konsumen yang men-destructure `getActivePLTA()` sekali saat init karena itu
 * membeku pada PLTA yang pertama kali dibuka: URL berubah, query masih memakai
 * id lama. Yang dikunci di sini mekanismenya, bukan renderan halaman penuh.
 */

function activePLTA(pltaId: string, displayName: string): ActivePLTA {
	return {
		pltaId,
		plant: { id: pltaId, name: displayName } as unknown as Plant,
		displayName
	};
}

describe('context PLTA aktif', () => {
	it('memperbarui konsumen saat accessor context mengembalikan PLTA lain', async () => {
		const { rerender } = render(ActivePLTAContextHarness, {
			props: { activePLTA: activePLTA('plta-soedirman', 'Soedirman') }
		});

		expect(screen.getByTestId('plta-id')).toHaveTextContent('plta-soedirman');
		expect(screen.getByTestId('plta-name')).toHaveTextContent('Soedirman');
		expect(screen.getByTestId('query-accessor')).toHaveTextContent('plta-soedirman');
		expect(screen.getByTestId('plta-id-only')).toHaveTextContent('plta-soedirman');

		// Layout tidak di-remount; hanya nilai yang dikembalikan accessor berganti.
		await rerender({ activePLTA: activePLTA('plta-wonogiri', 'Wonogiri') });

		expect(screen.getByTestId('plta-id')).toHaveTextContent('plta-wonogiri');
		expect(screen.getByTestId('plta-name')).toHaveTextContent('Wonogiri');
		// Accessor yang diteruskan ke query harus ikut membaca nilai terbaru,
		// bukan konstanta hasil destructure saat init.
		expect(screen.getByTestId('query-accessor')).toHaveTextContent('plta-wonogiri');
		expect(screen.getByTestId('plta-id-only')).toHaveTextContent('plta-wonogiri');
	});
});
