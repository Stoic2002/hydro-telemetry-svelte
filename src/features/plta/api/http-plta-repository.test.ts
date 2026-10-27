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

const WS_ID = '22222222-2222-4222-8222-222222222222';

function plant(patch: Record<string, unknown> = {}) {
	return {
		id: PLTA_ID,
		code: 'PBS',
		name: 'Soedirman',
		ws_id: WS_ID,
		latitude: -7.39,
		longitude: 109.68,
		capacity_mw: 184.5,
		description: null,
		is_active: true,
		beban_to_outflow_num: 204,
		beban_to_outflow_den: 180,
		constants: { tma_limpas: 231.5 },
		...patch
	};
}

describe('PLTA dan Wilayah Sungai: tambah dan ubah', () => {
	it('tambah PLTA mengirim nama bidang API dan tidak pernah mengirim constants', async () => {
		apiRequestMock.mockResolvedValue(plant());

		await httpPltaRepository.createPlant({
			code: 'PBS',
			name: 'Soedirman',
			riverBasinId: WS_ID,
			latitude: null,
			longitude: null,
			capacityMw: 184.5,
			description: null,
			isActive: true,
			bebanToOutflowNum: 204,
			bebanToOutflowDen: 180
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/plta');
		expect(options?.method).toBe('POST');
		expect(options?.json).toStrictEqual({
			code: 'PBS',
			name: 'Soedirman',
			ws_id: WS_ID,
			latitude: null,
			longitude: null,
			capacity_mw: 184.5,
			description: null,
			is_active: true,
			beban_to_outflow_num: 204,
			beban_to_outflow_den: 180
		});
	});

	it('ubah PLTA hanya mengirim bidang yang berubah, termasuk null untuk mengosongkan', async () => {
		apiRequestMock.mockResolvedValue(plant({ latitude: null, longitude: null }));

		const updated = await httpPltaRepository.updatePlant(PLTA_ID, {
			latitude: null,
			longitude: null,
			isActive: false
		});

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe(`/api/v1/plta/${PLTA_ID}`);
		expect(options?.method).toBe('PATCH');
		// Tanpa `constants`: server menimpanya utuh bila dikirim.
		expect(options?.json).toStrictEqual({ latitude: null, longitude: null, is_active: false });
		expect(updated.constants).toEqual({ tma_limpas: 231.5 });
	});

	it('tambah dan ubah Wilayah Sungai', async () => {
		const riverBasin = { id: WS_ID, code: 'WS-SERAYU', name: 'Serayu', description: null };
		apiRequestMock.mockResolvedValue(riverBasin);

		await httpPltaRepository.createRiverBasin({
			code: 'WS-SERAYU',
			name: 'Serayu',
			description: null
		});
		await httpPltaRepository.updateRiverBasin(WS_ID, { name: 'Serayu Bogowonto' });

		expect(apiRequestMock.mock.calls[0][0]).toBe('/api/v1/wilayah-sungai');
		expect(apiRequestMock.mock.calls[0][1]?.json).toStrictEqual({
			code: 'WS-SERAYU',
			name: 'Serayu',
			description: null
		});
		expect(apiRequestMock.mock.calls[1][0]).toBe(`/api/v1/wilayah-sungai/${WS_ID}`);
		expect(apiRequestMock.mock.calls[1][1]).toMatchObject({
			method: 'PATCH',
			json: { name: 'Serayu Bogowonto' }
		});
	});
});

describe('tag baru', () => {
	const input = {
		pltaId: PLTA_ID,
		parameter: 'plan_outflow_hjv',
		station: '',
		label: null,
		protocol: 'upload' as const,
		address: 'upload',
		httpHeaders: null,
		valuePath: null,
		timestampPath: null,
		scale: 1,
		offset: 0,
		unit: 'm3/s',
		minValid: null,
		maxValid: null,
		enabled: true,
		panel: 'dam' as const
	};

	it('tidak mengirim bidang REST untuk protokol lain', async () => {
		apiRequestMock.mockResolvedValue(tag({ protocol: 'upload', address: 'upload' }));

		await httpPltaRepository.createTag(input);

		const [endpoint, options] = apiRequestMock.mock.calls[0];
		expect(endpoint).toBe('/api/v1/tags');
		expect(options?.method).toBe('POST');
		expect(options?.json).toStrictEqual({
			plta_id: PLTA_ID,
			parameter: 'plan_outflow_hjv',
			station: '',
			label: null,
			protocol: 'upload',
			address: 'upload',
			scale: 1,
			offset: 0,
			unit: 'm3/s',
			min_valid: null,
			max_valid: null,
			enabled: true,
			panel: 'dam'
		});
	});

	it('mengirim bidang REST untuk protokol REST', async () => {
		apiRequestMock.mockResolvedValue(tag({ protocol: 'rest', address: 'https://x' }));

		await httpPltaRepository.createTag({
			...input,
			protocol: 'rest',
			address: 'https://x',
			httpHeaders: { Authorization: 'Bearer ${TOKEN}' },
			valuePath: 'data.tma'
		});

		expect(apiRequestMock.mock.calls[0][1]?.json).toMatchObject({
			http_headers: { Authorization: 'Bearer ${TOKEN}' },
			value_path: 'data.tma',
			timestamp_path: null
		});
	});
});
