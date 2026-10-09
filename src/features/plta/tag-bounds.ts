import { formatNumber } from '$shared/utils/number';
import type { TagBounds } from './model';

export type ParsedTagBounds = { ok: true; bounds: TagBounds } | { ok: false; message: string };

function finiteOrNull(value: number | null): number | null {
	return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * Isian form → rentang yang dikirim. Server menolak `min_valid` ≥ `max_valid`
 * dengan 400; di sini ditolak lebih dulu supaya pesannya langsung di form.
 * Dua sisi kosong sah dan berarti "cabut pembatasan".
 */
export function parseTagBounds(min: number | null, max: number | null): ParsedTagBounds {
	const minValid = finiteOrNull(min);
	const maxValid = finiteOrNull(max);

	if (minValid !== null && maxValid !== null && minValid >= maxValid) {
		return { ok: false, message: 'Batas bawah harus lebih kecil dari batas atas.' };
	}

	return { ok: true, bounds: { minValid, maxValid } };
}

/** `0 – 120`, `≥ 0`, `≤ 120`, atau `null` bila tanpa batas. */
export function describeTagBounds(bounds: TagBounds): string | null {
	const { minValid, maxValid } = bounds;
	if (minValid === null && maxValid === null) return null;

	const format = (value: number) => formatNumber(value, Number.isInteger(value) ? 0 : 2);
	if (minValid !== null && maxValid !== null) return `${format(minValid)} – ${format(maxValid)}`;
	return minValid !== null ? `≥ ${format(minValid)}` : `≤ ${format(maxValid as number)}`;
}
