import { describe, expect, it } from 'vitest';
import type { Plant } from '$features/plta';
import {
	MAX_DAILY_TEMPLATE_RANGE_DAYS,
	dailyTemplateFilename,
	dailyTemplateRangeError,
	formatUploadedPeriods,
	parseUploadTab,
	resolveEvaPlant
} from './model';

function plant(id: string, isActive = true): Plant {
	return { id, code: id.toUpperCase(), name: `PLTA ${id}`, isActive } as Plant;
}

describe('tab halaman Upload', () => {
	it('membaca tab dari URL', () => {
		expect(parseUploadTab('harian')).toBe('harian');
		expect(parseUploadTab('eva')).toBe('eva');
	});

	it('jatuh ke Excel Bulanan untuk nilai yang tidak dikenal', () => {
		// Tautan lama dan salah ketik tidak boleh berakhir di panel kosong.
		expect(parseUploadTab(null)).toBe('excel');
		expect(parseUploadTab('ghw')).toBe('excel');
	});
});

describe('PLTA untuk tab Input EVA', () => {
	const plants = [plant('a', false), plant('b'), plant('c')];

	it('memakai PLTA dari URL bila ada di katalog', () => {
		expect(resolveEvaPlant(plants, 'c')?.id).toBe('c');
	});

	it('jatuh ke PLTA aktif pertama bila id tidak dikenal', () => {
		// Berkas EVA milik satu PLTA; panel tidak boleh kosong karena id asing.
		expect(resolveEvaPlant(plants, 'tidak-ada')?.id).toBe('b');
		expect(resolveEvaPlant(plants, null)?.id).toBe('b');
	});

	it('tetap memberi PLTA walau tidak ada yang aktif', () => {
		expect(resolveEvaPlant([plant('a', false)], null)?.id).toBe('a');
	});

	it('mengembalikan undefined bila katalog kosong', () => {
		expect(resolveEvaPlant([], null)).toBeUndefined();
	});
});

describe('rentang template Excel harian', () => {
	it('menerima satu hari dan rentang tepat di batas', () => {
		expect(dailyTemplateRangeError('2026-09-18', '2026-09-18')).toBeNull();
		// 1 Sep + 91 hari = 92 hari inklusif, masih diterima server.
		expect(dailyTemplateRangeError('2026-09-01', '2026-12-01')).toBeNull();
	});

	it('menolak rentang satu hari melebihi batas server', () => {
		expect(dailyTemplateRangeError('2026-09-01', '2026-12-02')).toBe(
			`Rentang maksimal ${MAX_DAILY_TEMPLATE_RANGE_DAYS} hari.`
		);
	});

	it('menolak tanggal terbalik dan isian kosong', () => {
		expect(dailyTemplateRangeError('2026-09-30', '2026-09-01')).toBe(
			'Tanggal akhir tidak boleh sebelum tanggal awal.'
		);
		expect(dailyTemplateRangeError('', '2026-09-01')).toBe('Isi tanggal awal dan akhir.');
	});
});

describe('nama berkas dan periode unggahan', () => {
	it('menyebut rentang pada nama template', () => {
		expect(dailyTemplateFilename('2026-09-01', '2026-09-01')).toBe(
			'hidrologi_harian_2026-09-01.xlsx'
		);
		expect(dailyTemplateFilename('2026-09-01', '2026-09-30')).toBe(
			'hidrologi_harian_2026-09-01_sd_2026-09-30.xlsx'
		);
	});

	it('merangkum tanggal hasil unggah jadi satu rentang', () => {
		expect(formatUploadedPeriods(['2026-09-30', '2026-09-01', '2026-09-15'])).toBe(
			'01 Sep 2026 – 30 Sep 2026'
		);
		expect(formatUploadedPeriods(['2026-09-01'])).toBe('01 Sep 2026');
		expect(formatUploadedPeriods([])).toBe('');
	});
});
