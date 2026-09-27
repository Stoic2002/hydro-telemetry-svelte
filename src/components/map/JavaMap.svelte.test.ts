import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Plant } from '$features/plta';
import JavaMapHarness from './JavaMap.test-harness.svelte';
import * as labelPlacement from './label-placement';
import { createMapLayersQuery, createCloudImageryQuery } from './queries';
import { createMeasuredRainQuery } from '$features/monitoring';
import { createPlantCatalogQuery } from '$features/plta';

/**
 * Menyorot penanda mengubah state di komponen teratas peta.
 *
 * Yang dikunci di sini adalah perhitungan geometrinya: centroid kabupaten dari
 * ribuan titik tidak boleh dihitung ulang setiap sorotan berubah. Di versi React
 * penjaganya `useMemo`; di sini `$derived` yang tidak membaca `hoveredId`.
 *
 * Catatan cakupan: penanda ini mengunci perhitungan centroid, BUKAN pembuatan
 * path SVG untuk fitur sungai — yang terakhir tidak tertangkap di sini.
 */

vi.mock('./queries', () => ({
	createMapLayersQuery: vi.fn(),
	createCloudImageryQuery: vi.fn()
}));

vi.mock('$features/monitoring', async (importOriginal) => ({
	...(await importOriginal<typeof import('$features/monitoring')>()),
	createMeasuredRainQuery: vi.fn(() => ({ data: [], isError: false }))
}));

vi.mock('$features/plta', async (importOriginal) => ({
	...(await importOriginal<typeof import('$features/plta')>()),
	createPlantCatalogQuery: vi.fn()
}));

const createMapLayersQueryMock = vi.mocked(createMapLayersQuery);
const createCloudImageryQueryMock = vi.mocked(createCloudImageryQuery);
const createPlantCatalogQueryMock = vi.mocked(createPlantCatalogQuery);

function regency(name: string, offset: number) {
	return {
		type: 'Feature',
		properties: { namobj: name },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[109 + offset, -7],
					[109.4 + offset, -7],
					[109.4 + offset, -7.4],
					[109 + offset, -7.4],
					[109 + offset, -7]
				]
			]
		}
	};
}

const MAP_LAYERS = {
	regencies: {
		type: 'FeatureCollection',
		features: [regency('Banjarnegara', 0), regency('Wonosobo', 0.5), regency('Kebumen', 1)]
	},
	rivers: { type: 'FeatureCollection', features: [] }
};

const PLANTS = [
	{
		id: 'plta-soedirman',
		name: 'PLTA Soedirman',
		code: 'SDR',
		riverBasinId: 'ws-1',
		latitude: -7.3,
		longitude: 109.6,
		capacityMw: 180,
		description: null,
		isActive: true
	}
] as unknown as Plant[];

function renderMap(onPLTAClick = vi.fn()) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return { onPLTAClick, ...render(JavaMapHarness, { props: { queryClient, onPLTAClick } }) };
}

beforeEach(() => {
	createMapLayersQueryMock.mockReturnValue({
		data: MAP_LAYERS,
		isError: false,
		isPending: false,
		refetch: vi.fn()
	} as unknown as ReturnType<typeof createMapLayersQuery>);

	createCloudImageryQueryMock.mockReturnValue({
		data: undefined,
		isError: false,
		isPending: true,
		fetchStatus: 'idle',
		refetch: vi.fn()
	} as unknown as ReturnType<typeof createCloudImageryQuery>);

	createPlantCatalogQueryMock.mockReturnValue({
		data: PLANTS,
		isError: false,
		isPending: false,
		isSuccess: true,
		error: null,
		refetch: vi.fn()
	} as unknown as ReturnType<typeof createPlantCatalogQuery>);
});

describe('perhitungan geometri saat sorotan berubah', () => {
	it('tidak menghitung ulang centroid kabupaten saat penanda disorot', async () => {
		const getLabelCoordinate = vi.spyOn(labelPlacement, 'getLabelCoordinate');
		const user = userEvent.setup();
		renderMap();

		const afterFirstRender = getLabelCoordinate.mock.calls.length;
		expect(afterFirstRender).toBeGreaterThan(0);

		const marker = screen.getByRole('button', { name: /PLTA Soedirman/i });
		await user.hover(marker);
		await user.unhover(marker);
		await user.hover(marker);

		// Kalau `regencyLabels` ikut membaca `hoveredId`, angka ini bertambah
		// setiap kali sorotan berubah.
		expect(getLabelCoordinate.mock.calls.length).toBe(afterFirstRender);
		getLabelCoordinate.mockRestore();
	});

	it('tetap menampilkan seluruh label kabupaten', () => {
		renderMap();

		// Optimasi tidak boleh menghilangkan konten.
		expect(screen.getByText('Banjarnegara')).toBeInTheDocument();
		expect(screen.getByText('Wonosobo')).toBeInTheDocument();
		expect(screen.getByText('Kebumen')).toBeInTheDocument();
	});
});

describe('penanda PLTA', () => {
	it('mengekspos setiap PLTA sebagai tombol bernama', () => {
		renderMap();

		// `getPlantDisplayName` memangkas awalan "PLTA" dari nama, jadi labelnya
		// tidak berbunyi "PLTA PLTA Soedirman".
		expect(
			screen.getByRole('button', { name: 'Buka telemetering PLTA Soedirman' })
		).toBeInTheDocument();
	});

	it('membuka PLTA saat penanda diklik', async () => {
		const user = userEvent.setup();
		const { onPLTAClick } = renderMap();

		await user.click(screen.getByRole('button', { name: /PLTA Soedirman/i }));

		expect(onPLTAClick).toHaveBeenCalledWith('plta-soedirman');
	});

	it('membuka PLTA lewat keyboard', async () => {
		const user = userEvent.setup();
		const { onPLTAClick } = renderMap();

		screen.getByRole('button', { name: /PLTA Soedirman/i }).focus();
		await user.keyboard('{Enter}');

		expect(onPLTAClick).toHaveBeenCalledWith('plta-soedirman');
	});
});

describe('hujan terukur', () => {
	function renderWithRain(showPrecipitation = true) {
		vi.mocked(createMeasuredRainQuery).mockReturnValue({
			data: [
				{
					pltaId: 'plta-soedirman',
					status: 'raining',
					stationCount: 4,
					peak: { station: 'ARR_ST02', value: 0.6, time: '2026-09-25T03:00:00Z' },
					latestTime: '2026-09-25T03:00:00Z'
				},
				{
					pltaId: 'plta-sidorejo',
					status: 'stale',
					stationCount: 1,
					peak: null,
					latestTime: '2026-09-24T20:00:00Z'
				}
			],
			isError: false
		} as unknown as ReturnType<typeof createMeasuredRainQuery>);
		createPlantCatalogQueryMock.mockReturnValue({
			data: [
				...PLANTS,
				// Tanpa koordinat: tidak ada di peta, tetapi penakarnya tetap dilaporkan.
				{
					...PLANTS[0],
					id: 'plta-sidorejo',
					name: 'PLTA Sidorejo',
					latitude: null,
					longitude: null
				}
			],
			isError: false,
			isPending: false,
			isSuccess: true,
			error: null,
			refetch: vi.fn()
		} as unknown as ReturnType<typeof createPlantCatalogQuery>);

		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		return render(JavaMapHarness, {
			props: { queryClient, onPLTAClick: vi.fn(), showPrecipitation }
		});
	}

	it('menyebut hujan terukur pada label penanda PLTA', () => {
		renderWithRain();

		expect(
			screen.getByRole('button', { name: /PLTA Soedirman\. Hujan terukur 0,6 mm/ })
		).toBeInTheDocument();
	});

	it('mencantumkan PLTA berpenakar tanpa koordinat di daftar panel', () => {
		renderWithRain();

		expect(screen.getByText('Sidorejo')).toBeInTheDocument();
		expect(screen.getByText(/Tidak diperbarui sejak/)).toBeInTheDocument();
	});

	it('meringkas PLTA yang tidak hujan dan hanya merinci yang perlu perhatian', () => {
		renderWithRain();

		// Soedirman hujan dan Sidorejo diam: keduanya dirinci, tanpa baris ringkasan kering.
		expect(screen.getByText('0,6 mm · 10:00 · ARR_ST02')).toBeInTheDocument();
		expect(screen.queryByText(/Tidak hujan di/)).not.toBeInTheDocument();
	});
});
