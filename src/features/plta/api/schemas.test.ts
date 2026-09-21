import { describe, expect, it } from 'vitest';
import { paginatedPlantTagsSchema } from './schemas';

/**
 * Satu tag dengan protokol yang tidak dikenal membuat seluruh halaman daftar
 * tag gagal divalidasi — bukan hanya tag itu. Pernah terjadi saat backend
 * menambah `derived` untuk `total_outflow` Wonogiri: Tren & Grafik PLTA itu
 * kehilangan seluruh parameternya.
 */

function tag(protocol: string) {
	return {
		plta_id: 'aa48b04f-1b3f-44cf-b7da-188b73e36aab',
		parameter: 'total_outflow',
		station: 'T1',
		protocol,
		address: '',
		scale: 1,
		offset: 0,
		unit: null,
		enabled: true,
		id: '9b2f6a3e-1d4c-4e8a-9f0b-2c3d4e5f6a7b'
	};
}

function page(items: unknown[]) {
	return { items, total: items.length, page: 1, limit: 200, pages: 1 };
}

describe('kontrak daftar tag PLTA', () => {
	it('menerima seluruh protokol ingestion yang dikenal backend', () => {
		const protocols = ['opcua', 'modbus', 'sql', 'rest', 'upload', 'derived'];

		expect(paginatedPlantTagsSchema.safeParse(page(protocols.map(tag))).success).toBe(true);
	});

	it('menolak protokol yang tidak dikenal', () => {
		expect(paginatedPlantTagsSchema.safeParse(page([tag('mqtt')])).success).toBe(false);
	});
});
