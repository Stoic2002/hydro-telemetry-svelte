import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import HydrologyMetricCard from './HydrologyMetricCard.svelte';
import type { MetricRow } from './presentation';

function row(index: number, isStale = false): MetricRow {
	return {
		key: `metric_${index}`,
		label: `Parameter ${index}`,
		value: '1',
		source: 'Realtime',
		sourceType: 'api',
		freshness: isStale
			? { level: 'stale', ageLabel: '4 hari lalu', measuredAt: '2026-09-21T08:00:00Z' }
			: undefined
	};
}

describe('kartu zona dalam tampilan ringkas', () => {
	it('tetap menampilkan sensor basi di luar lima baris pertama', () => {
		// Banner ringkasan menautkan ke baris ini; bila tersembunyi, tautannya
		// tidak menemukan apa-apa — dan sensor yang berhenti ikut tak terlihat.
		const rows = [1, 2, 3, 4, 5, 6, 7].map((index) => row(index, index === 7));
		render(HydrologyMetricCard, {
			props: { zone: 'upstream', sections: [{ title: 'Hulu', rows }] }
		});

		// Kata terakhir label dibungkus elemen sendiri bersama penanda sumber,
		// jadi baris dicari lewat id-nya, bukan teks label utuh.
		expect(document.getElementById('metric-metric_7')).toHaveTextContent('Parameter 7');
		expect(document.getElementById('metric-metric_6')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Lihat semua (7)' })).toBeInTheDocument();
	});
});

describe('kontrol zona yang ditempelkan ke sebuah baris', () => {
	const control = createRawSnippet(() => ({
		render: () => '<div data-testid="unit-picker">Unit beban penuh</div>'
	}));

	function precedingLabel() {
		// Baris tepat sebelum kontrol: pembungkus kontrol bersaudara dengan baris metrik.
		const wrapper = screen.getByTestId('unit-picker').parentElement;
		return wrapper?.previousElementSibling?.textContent ?? null;
	}

	it('tampil tepat di bawah baris tujuannya bila baris itu terlihat', () => {
		const rows = [1, 2, 3].map((index) => row(index));
		render(HydrologyMetricCard, {
			props: {
				zone: 'upstream',
				sections: [{ title: 'Hulu', rows }],
				zoneControl: control,
				zoneControlAfterKey: 'metric_2'
			}
		});

		expect(precedingLabel()).toContain('Parameter 2');
	});

	it('kembali ke bawah judul bila baris tujuannya terlipat atau tidak ada', () => {
		const rows = [1, 2, 3, 4, 5, 6, 7].map((index) => row(index));
		render(HydrologyMetricCard, {
			props: {
				zone: 'upstream',
				sections: [{ title: 'Hulu', rows }],
				zoneControl: control,
				zoneControlAfterKey: 'metric_7'
			}
		});

		expect(screen.getByTestId('unit-picker')).toBeInTheDocument();
		expect(precedingLabel()).not.toContain('Parameter');
	});
});
