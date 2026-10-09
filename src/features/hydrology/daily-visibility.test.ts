import { describe, expect, it } from 'vitest';
import {
	groupByPanel,
	panelOrderChanges,
	resolvePanelOrder,
	visibilityChanges
} from './daily-visibility';
import type { DailyMetricVisibility } from './model';

const metrics: DailyMetricVisibility[] = [
	{ key: 'tma_waduk', panel: 'hulu', label: 'TMA Waduk', hidden: false, isCustomOrder: false },
	{ key: 'ph_hulu', panel: 'hulu', label: 'pH Hulu', hidden: true, isCustomOrder: false },
	{ key: 'inflow', panel: 'hulu', label: 'Inflow', hidden: false, isCustomOrder: false },
	{
		key: 'debit_spillway',
		panel: 'dam',
		label: 'Debit Spillway',
		hidden: false,
		isCustomOrder: false
	},
	{ key: 'ph_hilir', panel: 'hilir', label: 'pH Hilir', hidden: false, isCustomOrder: false }
];

describe('visibilityChanges', () => {
	it('hanya memuat kunci yang berbeda dari kondisi tersimpan', () => {
		// `debit_spillway` disentuh tetapi sama dengan yang tersimpan.
		const draft = { ph_hulu: false, ph_hilir: true, debit_spillway: false };

		expect(visibilityChanges(metrics, draft)).toEqual({ ph_hulu: false, ph_hilir: true });
	});

	it('kosong bila tidak ada yang disentuh', () => {
		expect(visibilityChanges(metrics, {})).toEqual({});
	});

	it('kosong bila pilihan dikembalikan ke keadaan semula', () => {
		expect(visibilityChanges(metrics, { tma_waduk: false })).toEqual({});
	});

	it('membandingkan dengan data server terbaru, bukan saat sheet dibuka', () => {
		// Operator lain sudah menyembunyikan pH Hilir; draf yang menyetel hal yang
		// sama tidak lagi dianggap perubahan.
		const latest = metrics.map((metric) =>
			metric.key === 'ph_hilir' ? { ...metric, hidden: true } : metric
		);

		expect(visibilityChanges(latest, { ph_hilir: true })).toEqual({});
	});
});

describe('groupByPanel', () => {
	it('mengelompokkan per panel dengan urutan hulu, bendungan, hilir', () => {
		const groups = groupByPanel([...metrics].reverse());

		expect(groups.map((group) => group.panel)).toEqual(['hulu', 'dam', 'hilir']);
		expect(groups[0].label).toBe('Hulu');
		expect(groups[1].label).toBe('Bendungan dan pelepasan');
	});

	it('melewatkan panel yang tidak punya metrik', () => {
		const groups = groupByPanel(metrics.filter((metric) => metric.panel !== 'dam'));

		expect(groups.map((group) => group.panel)).toEqual(['hulu', 'hilir']);
	});
});

describe('resolvePanelOrder', () => {
	it('memakai urutan server bila tidak ada draf', () => {
		expect(resolvePanelOrder(['a', 'b'], undefined)).toEqual(['a', 'b']);
	});

	it('membuang kunci yang hilang dan menaruh kunci baru di belakang', () => {
		expect(resolvePanelOrder(['a', 'b', 'd'], ['b', 'c', 'a'])).toEqual(['b', 'a', 'd']);
	});
});

describe('panelOrderChanges', () => {
	it('mengirim seluruh kunci panel yang urutannya diubah', () => {
		expect(panelOrderChanges(metrics, { hulu: ['inflow', 'tma_waduk', 'ph_hulu'] })).toEqual({
			hulu: ['inflow', 'tma_waduk', 'ph_hulu']
		});
	});

	it('tidak mengirim panel yang diseret lalu dikembalikan ke posisi semula', () => {
		expect(panelOrderChanges(metrics, { hulu: ['tma_waduk', 'ph_hulu', 'inflow'] })).toEqual({});
	});

	it('mengirim [] untuk mengembalikan panel ke urutan bawaan', () => {
		expect(panelOrderChanges(metrics, { dam: null })).toEqual({ dam: [] });
	});

	it('melengkapi draf yang belum memuat metrik baru dari server', () => {
		expect(panelOrderChanges(metrics, { hulu: ['inflow', 'tma_waduk'] })).toEqual({
			hulu: ['inflow', 'tma_waduk', 'ph_hulu']
		});
	});
});
