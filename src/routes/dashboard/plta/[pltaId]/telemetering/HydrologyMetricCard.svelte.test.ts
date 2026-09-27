import { render, screen } from '@testing-library/svelte';
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

		expect(screen.getByText('Parameter 7')).toBeInTheDocument();
		expect(screen.queryByText('Parameter 6')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Lihat semua (7)' })).toBeInTheDocument();
	});
});
