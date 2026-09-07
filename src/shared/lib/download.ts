/**
 * Memicu unduhan berkas dari blob yang sudah diterima. Dipakai bersama oleh
 * unduhan laporan dan template hidrologi bulanan — sebelumnya potongan kode
 * yang sama ditulis ulang di tiap halaman.
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	anchor.click();

	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
