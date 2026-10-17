import type { LabelChanges } from './model';

/** Batas server untuk nama metrik harian dan bidang bulanan. */
export const LABEL_MAX_LENGTH = 128;

interface SavedLabel {
	key: string;
	label: string;
	/** `true` = nama khusus dari admin sedang berlaku. */
	isCustom: boolean;
}

/** Spasi ganda/tepi dirapikan seperti di server; isian kosong = kembali ke nama bawaan. */
function tidy(value: string): string | null {
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return trimmed === '' ? null : trimmed;
}

/**
 * Perubahan nama yang dikirim: hanya isian yang DISENTUH dan nilainya
 * benar-benar berbeda dari yang tersimpan. Isian kosong berarti kembali ke
 * nama bawaan (`null`) — server menolak nama kosong.
 *
 * `draft` hanya memuat isian yang disentuh admin, bukan salinan seluruh nama:
 * query sumbernya bisa menyegarkan diri, dan salinan penuh akan membatalkan
 * perubahan admin lain saat disimpan.
 */
export function labelChanges(
	saved: readonly SavedLabel[],
	draft: Readonly<Record<string, string>>
): LabelChanges {
	const changes: LabelChanges = {};
	for (const item of saved) {
		if (!(item.key in draft)) continue;
		const next = tidy(draft[item.key]);
		const current = item.isCustom ? item.label : null;
		if (next !== current) changes[item.key] = next;
	}
	return changes;
}
