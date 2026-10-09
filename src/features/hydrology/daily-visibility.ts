import type { DailyMetricVisibility, DailyReportPanel } from './model';

export const DAILY_PANEL_LABEL: Record<DailyReportPanel, string> = {
	hulu: 'Hulu',
	dam: 'Bendungan dan pelepasan',
	hilir: 'Hilir'
};

const PANEL_ORDER: DailyReportPanel[] = ['hulu', 'dam', 'hilir'];

/**
 * `draft` hanya memuat sakelar yang disentuh operator; hasilnya hanya kunci
 * yang berbeda dari kondisi tersimpan. Server menerima perubahan
 * parsial, dan mengirim seluruh daftar akan menandai setiap metrik sebagai
 * "diubah oleh" pengguna ini walau tidak disentuh.
 */
export function visibilityChanges(
	metrics: DailyMetricVisibility[],
	draft: Record<string, boolean>
): Record<string, boolean> {
	const changes: Record<string, boolean> = {};

	for (const metric of metrics) {
		const next = draft[metric.key];
		if (next !== undefined && next !== metric.hidden) changes[metric.key] = next;
	}

	return changes;
}

/** Metrik dikelompokkan per panel, mengikuti urutan tampil di halaman. */
export function groupByPanel(
	metrics: DailyMetricVisibility[]
): { panel: DailyReportPanel; label: string; metrics: DailyMetricVisibility[] }[] {
	return PANEL_ORDER.map((panel) => ({
		panel,
		label: DAILY_PANEL_LABEL[panel],
		metrics: metrics.filter((metric) => metric.panel === panel)
	})).filter((group) => group.metrics.length > 0);
}

/**
 * Draf urutan per panel. Larik = urutan yang diseret operator; `null` = minta
 * panel itu dikembalikan ke urutan bawaan server. Panel yang tidak disebut
 * belum disentuh.
 */
export type PanelOrderDraft = Partial<Record<DailyReportPanel, string[] | null>>;

/**
 * Urutan yang ditampilkan untuk satu panel: draf operator, disesuaikan dengan
 * daftar server terbaru — kunci yang sudah tidak ada dibuang, kunci baru
 * ditaruh di belakang. Tanpa draf, urutan server apa adanya.
 */
export function resolvePanelOrder(
	serverKeys: string[],
	draft: string[] | null | undefined
): string[] {
	if (!draft) return serverKeys;

	const known = new Set(serverKeys);
	const kept = draft.filter((key) => known.has(key));
	const keptSet = new Set(kept);
	return [...kept, ...serverKeys.filter((key) => !keptSet.has(key))];
}

/**
 * Bagian `urutan` permintaan simpan: hanya panel yang urutannya sungguh
 * berbeda dari server, berisi SELURUH kuncinya — server menaruh kunci yang
 * tidak disebut kembali ke posisi bawaan. `null` di draf dikirim sebagai `[]`
 * (kembali ke urutan bawaan).
 */
export function panelOrderChanges(
	metrics: DailyMetricVisibility[],
	draft: PanelOrderDraft
): Partial<Record<DailyReportPanel, string[]>> {
	const changes: Partial<Record<DailyReportPanel, string[]>> = {};

	for (const { panel, metrics: panelMetrics } of groupByPanel(metrics)) {
		if (!(panel in draft)) continue;

		const serverKeys = panelMetrics.map((metric) => metric.key);
		const next = draft[panel];
		if (next === null) {
			changes[panel] = [];
			continue;
		}

		const resolved = resolvePanelOrder(serverKeys, next);
		if (resolved.join('\n') !== serverKeys.join('\n')) changes[panel] = resolved;
	}

	return changes;
}
