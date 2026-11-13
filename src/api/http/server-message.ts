/**
 * Pesan galat server sebagian masih memuat teks bahasa Inggris dari pustaka
 * Python, mis. "Berkas tidak terbaca sebagai Excel: File is not a zip file"
 * (temuan QA T18). Potongan yang dikenal diganti kalimat Indonesia; sisanya
 * dibiarkan apa adanya supaya informasinya tidak hilang.
 */
const ENGLISH_FRAGMENTS: readonly [RegExp, string][] = [
	[
		/File is not a zip file/i,
		'berkas bukan .xlsx yang sah (mungkin .xls lama, .csv yang diganti namanya, atau berkas rusak)'
	],
	[/There is no item named '[^']*' in the archive/i, 'isi berkas tidak dikenali sebagai Excel'],
	[/Worksheet named '([^']*)' not found/i, "lembar kerja '$1' tidak ditemukan"],
	[/Bad CRC-32 for file '[^']*'/i, 'berkas rusak'],
	[/Request Entity Too Large/i, 'berkas terlalu besar']
];

/**
 * Teks status HTTP bawaan ("Bad Request", "Conflict") hanya dipakai bila server
 * tidak mengirim pesan sendiri; operator tidak perlu membaca istilah HTTP.
 */
const STATUS_MESSAGE: Readonly<Record<number, string>> = {
	400: 'Permintaan ditolak server',
	404: 'Data tidak ditemukan',
	409: 'Data bertabrakan dengan yang sudah ada',
	413: 'Berkas terlalu besar',
	422: 'Isian tidak lolos pemeriksaan server',
	500: 'Server sedang bermasalah',
	502: 'Server tidak dapat dijangkau',
	503: 'Server sedang tidak tersedia',
	504: 'Server terlalu lama merespons'
};

export function localizeServerMessage(message: string): string {
	return ENGLISH_FRAGMENTS.reduce(
		(text, [pattern, replacement]) => text.replace(pattern, replacement),
		message
	);
}

export function statusFallbackMessage(status: number): string | undefined {
	return STATUS_MESSAGE[status];
}
