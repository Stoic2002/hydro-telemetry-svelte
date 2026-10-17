import type { PlantTrendItemInput, PlantTrendList, TrendCandidate, TrendPanel } from './model';

/**
 * Draf daftar tren yang disunting admin. Aturan di sini meniru penolakan
 * server (`PUT /trends/plta/{id}/series`) supaya kesalahan terlihat sebelum
 * dikirim; server tetap yang memutuskan, dan satu masalah saja membuat tidak
 * ada yang tersimpan.
 */

export const TREND_LIST_LIMITS = { items: 50, label: 128, group: 64, unitsPerGroup: 2 } as const;

export interface TrendListDraftItem {
	key: string;
	/** Nama panel PLTA ini — placeholder isian nama. */
	defaultLabel: string;
	/** Nama khusus tren; kosong = ikut nama panel. */
	label: string;
	group: string;
	unit: string | null;
	panel: TrendPanel;
}

export function draftFromList(
	list: PlantTrendList,
	catalog: readonly TrendCandidate[]
): TrendListDraftItem[] {
	const candidates = new Map(catalog.map((candidate) => [candidate.key, candidate]));
	return [...list.items]
		.sort((first, second) => first.order - second.order)
		.map((item) => ({
			key: item.key,
			defaultLabel: candidates.get(item.key)?.label ?? item.label,
			label: item.isLabelCustom ? item.label : '',
			group: item.group ?? '',
			unit: item.unit,
			panel: item.panel
		}));
}

export function draftItemFromCandidate(candidate: TrendCandidate): TrendListDraftItem {
	return {
		key: candidate.key,
		defaultLabel: candidate.label,
		label: '',
		group: '',
		unit: candidate.unit,
		panel: candidate.panel
	};
}

/** Spasi ganda/tepi dirapikan seperti di server; isian kosong dikirim `null`. */
function tidy(value: string): string | null {
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return trimmed === '' ? null : trimmed;
}

export function draftToInput(draft: readonly TrendListDraftItem[]): PlantTrendItemInput[] {
	return draft.map((item) => ({ key: item.key, group: tidy(item.group), label: tidy(item.label) }));
}

export function validateTrendDraft(draft: readonly TrendListDraftItem[]): string[] {
	const problems: string[] = [];
	if (draft.length > TREND_LIST_LIMITS.items) {
		problems.push(`Maksimal ${TREND_LIST_LIMITS.items} item; sekarang ${draft.length}.`);
	}

	const unitsByGroup = new Map<string, Set<string>>();
	for (const item of draft) {
		const name = item.label.trim() || item.defaultLabel;
		if (item.label.trim().length > TREND_LIST_LIMITS.label) {
			problems.push(`Nama "${name}" lebih dari ${TREND_LIST_LIMITS.label} karakter.`);
		}
		const group = tidy(item.group);
		if (!group) continue;
		if (group.length > TREND_LIST_LIMITS.group) {
			problems.push(`Nama grup "${group}" lebih dari ${TREND_LIST_LIMITS.group} karakter.`);
		}
		const units = unitsByGroup.get(group) ?? new Set<string>();
		units.add(item.unit ?? '');
		unitsByGroup.set(group, units);
	}

	for (const [group, units] of unitsByGroup) {
		if (units.size > TREND_LIST_LIMITS.unitsPerGroup) {
			problems.push(
				`Grup "${group}" berisi ${units.size} satuan berbeda; maksimal ${TREND_LIST_LIMITS.unitsPerGroup}.`
			);
		}
	}
	return problems;
}
