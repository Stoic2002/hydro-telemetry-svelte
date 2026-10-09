import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpPltaRepository } from './http-plta-repository';

vi.mock('../../../api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../api/http')>()),
	apiRequest: vi.fn()
}));

const apiRequestMock = vi.mocked(apiRequest);

const TAG_ID = '33333333-3333-4333-8333-333333333333';
const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function tag(patch: Record<string, unknown> = {}) {
	return {
		id: TAG_ID,
		plta_id: PLTA_ID,
		parameter: 'water_level',
		station: '',
		protocol: 'opcua',
		address: 'ns=2;s=TMA',
		http_headers: null,
		value_path: null,
		timestamp_path: null,
		scale: 1,
		offset: 0,
		unit: 'mdpl',
		enabled: true,
		...patch
	};
}

beforeEach(() => {
	apiRequestMock.mockReset();
});

describe('tag: label dan batas valid', () => {
	it('memetakan `label`, `min_valid`, dan `max_valid`', async () => {
		apiRequestMock.mockResolvedValue({
			items: [tag({ label: 'TMA Waduk', min_valid: 220.5, max_valid: 231 })],
			total: 1,
			page: 1,
			limit: 20,
			pages: 1
		});

		const page = await httpPltaRepository.listTags(PLTA_ID, { page: 1, limit: 20 });

		expect(page.items[0]).toMatchObject({ label: 'TMA Waduk', minValid: 220.5, maxValid: 231 });
	});

	it('menganggap tag lama tanpa field itu sebagai tanpa batas', async () => {
		apiRequestMock.mockResolvedValue({ items: [tag()], total: 1, page: 1, limit: 20, pages: 1 });

		const page = await httpPltaRepository.listTags(PLTA_ID, { page: 1, limit: 20 });

		expect(page.items[0]).toMatchObject({ label: null, minValid: null, maxValid: null });
	});
});

describe('updateTagBounds', () => {
	it('mengirim kedua sisi, termasuk yang null', async () => {
		apiRequestMock.mockResolvedValue(tag({ min_valid: 0, max_valid: null }));

		await httpPltaRepository.updateTagBounds(TAG_ID, { minValid: 0, maxValid: null });

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/tags/${TAG_ID}/bounds`);
		expect(options?.method).toBe('PATCH');
		// `toStrictEqual`: kunci `max_valid` harus ada dengan nilai null, bukan
		// hilang — server menghapus sisi yang tidak dikirim.
		expect(options?.json).toStrictEqual({ min_valid: 0, max_valid: null });
	});

	it('mengirim dua null untuk mencabut pembatasan', async () => {
		apiRequestMock.mockResolvedValue(tag());

		const updated = await httpPltaRepository.updateTagBounds(TAG_ID, {
			minValid: null,
			maxValid: null
		});

		expect(apiRequestMock.mock.calls[0][1]?.json).toStrictEqual({
			min_valid: null,
			max_valid: null
		});
		expect(updated).toMatchObject({ minValid: null, maxValid: null });
	});

	it('memetakan tag hasil pembaruan', async () => {
		apiRequestMock.mockResolvedValue(tag({ min_valid: 1, max_valid: 9 }));

		const updated = await httpPltaRepository.updateTagBounds(TAG_ID, { minValid: 1, maxValid: 9 });

		expect(updated).toMatchObject({ id: TAG_ID, pltaId: PLTA_ID, minValid: 1, maxValid: 9 });
	});
});
