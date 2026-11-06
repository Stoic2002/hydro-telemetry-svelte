import type { MonitoringParameter, MonitoringParameterLatest } from './model';

/**
 * - `communication`: server OPC menyatakan tag TIDAK SEHAT (`bad`/`uncertain`,
 *   `value` null). Tidak ada data baru sampai nilai Good masuk lagi, dan
 *   turunannya (mis. volume dan inflow dari TMA) ikut kosong.
 * - `impossible`: pembacaan terakhir mustahil atau di luar batas tag. Angkanya
 *   masih dikirim untuk penelusuran tetapi tidak dipakai perhitungan.
 *
 * Sumbernya `GET /monitoring/plta/{id}/latest` (Swagger 6 Nov 2026).
 */
export type SensorProblemKind = 'communication' | 'impossible';

export interface SensorProblem {
	parameter: MonitoringParameter;
	station: string;
	kind: SensorProblemKind;
	/** Sejak kapan statusnya berlaku (`time` dari server). */
	since: string | null;
	/** Hanya terisi untuk `impossible`. */
	value: number | null;
}

const QUALITY_KIND: Readonly<Record<string, SensorProblemKind>> = {
	bad: 'communication',
	uncertain: 'communication',
	impossible: 'impossible'
};

/** Komunikasi putus lebih genting dari nilai mustahil, jadi diurutkan lebih dulu. */
const KIND_ORDER: Readonly<Record<SensorProblemKind, number>> = {
	communication: 0,
	impossible: 1
};

export function sensorProblems(
	parameters: readonly MonitoringParameterLatest[] | undefined
): SensorProblem[] {
	const problems: SensorProblem[] = [];

	for (const reading of parameters ?? []) {
		const kind = QUALITY_KIND[reading.quality?.trim().toLowerCase() ?? ''];
		if (!kind) continue;
		problems.push({
			parameter: reading.parameter,
			station: reading.station,
			kind,
			since: reading.time,
			value: kind === 'impossible' ? reading.value : null
		});
	}

	return problems.sort(
		(a, b) =>
			KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
			a.parameter.localeCompare(b.parameter) ||
			a.station.localeCompare(b.station)
	);
}

/** Kunci stabil satu sensor, untuk `{#each}` dan tanda "sudah ditutup". */
export function sensorProblemKey(problem: SensorProblem): string {
	return `${problem.parameter}|${problem.station}|${problem.kind}`;
}
