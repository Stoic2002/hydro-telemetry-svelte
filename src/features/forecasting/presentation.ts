import type { BadgeTone } from '$components/controls/Badge.svelte';
import type { ForecastAccuracySummary } from './model';

/**
 * Status kelayakan dari `akurasi.layak_disajikan` server. Dulu `false` ditulis
 * "Layak dengan catatan" — production mengirim `false` dengan skill −62,6
 * (lebih buruk dari tebakan "sama dengan kemarin"), dan badge itu terbaca
 * layak (temuan QA T27, disetujui 12 Nov 2026).
 */
export function forecastFeasibility(accuracy: ForecastAccuracySummary | null | undefined): {
	label: string;
	tone: BadgeTone;
} {
	if (!accuracy) return { label: 'Belum dinilai', tone: 'slate' };
	return accuracy.isPresentable
		? { label: 'Layak', tone: 'green' }
		: { label: 'Belum layak', tone: 'red' };
}

const PARAMETER_NAMES: Record<string, string> = {
	inflow: 'inflow',
	water_level: 'TMA'
};

/**
 * Nama model untuk dibaca operator. Server memberi nama teknis
 * `plta-<uuid>-<parameter>-h<jam>[-<versi>]`; UUID-nya tidak berarti apa-apa
 * bagi operator. Nama lain (mis. `fallback`) ditampilkan apa adanya.
 */
export function formatForecastModelName(name: string | null | undefined): string {
	if (!name) return '';
	const match = /^plta-[0-9a-f-]{36}-([a-z_]+)-h(\d+)(?:-(.+))?$/i.exec(name);
	if (!match) return name;
	const [, parameter, hours, version] = match;
	const label = PARAMETER_NAMES[parameter] ?? parameter.replaceAll('_', ' ');
	return `Model ${label} · ${hours} jam ke depan${version ? ` · ${version}` : ''}`;
}
