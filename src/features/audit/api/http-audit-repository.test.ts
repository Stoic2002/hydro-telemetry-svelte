import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../api/http';
import { httpAuditRepository } from './http-audit-repository';

vi.mock('../../../api/http', async () => {
	const actual = await vi.importActual<typeof import('../../../api/http')>('../../../api/http');
	return { ...actual, apiRequest: vi.fn() };
});

const apiRequestMock = vi.mocked(apiRequest);

function emptyPage(overrides: Record<string, unknown> = {}) {
	return { items: [], total: 0, page: 1, limit: 10, pages: 0, ...overrides };
}

function lastQuery(): Record<string, unknown> {
	const [, options] = apiRequestMock.mock.calls.at(-1) ?? [];
	return (options?.query ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
	apiRequestMock.mockResolvedValue(emptyPage());
});

describe('httpAuditRepository.listUploads', () => {
	/**
	 * Backend memperlakukan setiap parameter yang HADIR sebagai saringan aktif.
	 * Mengirim `jenis=""` karena pengguna memilih "Semua jalur" akan menyaring
	 * habis hasilnya — tabel tampil kosong padahal riwayatnya ada.
	 */
	it('tidak mengirim saringan yang kosong', async () => {
		await httpAuditRepository.listUploads({
			page: 1,
			limit: 10,
			kind: '',
			action: '',
			pltaId: '',
			search: ''
		});

		const query = lastQuery();
		expect(query.page).toBe(1);
		expect(query.limit).toBe(10);
		expect(query.jenis).toBeUndefined();
		expect(query.aksi).toBeUndefined();
		expect(query.plta_id).toBeUndefined();
		expect(query.search).toBeUndefined();
	});

	it('mengirim saringan yang terisi dengan nama parameter backend', async () => {
		await httpAuditRepository.listUploads({
			page: 2,
			limit: 20,
			kind: 'monthly_image',
			action: 'hapus',
			pltaId: '727c0a7e-2186-4c40-a995-62c7e4024ed5',
			search: 'bmkg'
		});

		expect(lastQuery()).toMatchObject({
			page: 2,
			limit: 20,
			jenis: 'monthly_image',
			aksi: 'hapus',
			plta_id: '727c0a7e-2186-4c40-a995-62c7e4024ed5',
			search: 'bmkg'
		});
	});

	it('memangkas spasi pada pencarian dan menganggap spasi saja sebagai kosong', async () => {
		await httpAuditRepository.listUploads({
			page: 1,
			limit: 10,
			search: '  bmkg  '
		});
		expect(lastQuery().search).toBe('bmkg');

		await httpAuditRepository.listUploads({ page: 1, limit: 10, search: '   ' });
		expect(lastQuery().search).toBeUndefined();
	});

	it('memetakan catatan lintas-PLTA tanpa kehilangan bahwa plta_id memang null', async () => {
		apiRequestMock.mockResolvedValue(
			emptyPage({
				items: [
					{
						id: '291b8d1e-ebe3-4b2d-b40c-16d180c76ae4',
						created_at: '2026-08-30T15:06:24.510877+07:00',
						jenis: 'monthly_image',
						aksi: 'upload',
						user_id: '9cd4a23e-bcbf-480d-900c-e600d7449608',
						username: 'admin',
						plta_id: null,
						plta_code: null,
						parameter: null,
						station: null,
						nama_berkas: 'bmkg.png',
						jumlah: 1,
						periode_start: null,
						periode_end: null,
						rincian: { tahun: 2026, bulan: 9, gambar: 'curah_hujan' }
					}
				],
				total: 1,
				pages: 1
			})
		);

		const page = await httpAuditRepository.listUploads({ page: 1, limit: 10 });

		expect(page.items).toHaveLength(1);
		expect(page.items[0]).toMatchObject({
			kind: 'monthly_image',
			action: 'upload',
			pltaId: null,
			pltaCode: null,
			fileName: 'bmkg.png',
			username: 'admin',
			count: 1
		});
		expect(page.items[0].details).toEqual({
			tahun: 2026,
			bulan: 9,
			gambar: 'curah_hujan'
		});
	});
});
