/**
 * Salinan `items` dengan elemen di `from` dipindah ke `to`. Indeks di luar
 * rentang dijepit ke ujung; larik asal tidak diubah.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items];
	if (from < 0 || from >= next.length) return next;

	const target = Math.min(Math.max(to, 0), next.length - 1);
	const [moved] = next.splice(from, 1);
	next.splice(target, 0, moved);
	return next;
}
