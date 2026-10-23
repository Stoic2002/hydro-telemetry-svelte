/**
 * Satuan dari server ditulis ASCII (`m3/s`, `degC`) karena berasal dari
 * konfigurasi tag. Di layar ditampilkan dengan simbol yang lazim dibaca
 * operator. Hanya untuk tampilan — kunci, nama berkas, dan isian yang dikirim
 * balik ke server tetap memakai teks aslinya.
 */
const SYMBOLS: readonly [RegExp, string][] = [
	[/\bm3\b/g, 'm³'],
	[/\bm2\b/g, 'm²'],
	[/\bdeg ?C\b/gi, '°C']
];

export function displayUnit(unit: string): string;
export function displayUnit(unit: string | null | undefined): string | undefined;
export function displayUnit(unit: string | null | undefined): string | undefined {
	if (unit === null || unit === undefined) return undefined;
	return SYMBOLS.reduce((text, [pattern, symbol]) => text.replace(pattern, symbol), unit.trim());
}
