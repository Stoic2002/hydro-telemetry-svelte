/**
 * Menjaga object URL browser tetap sinkron dengan sebuah Blob, lalu mencabutnya
 * saat tidak dipakai lagi.
 *
 * Blob gambar bulanan datang dari cache query dan bisa berganti ketika periode
 * diubah; tanpa `revokeObjectURL`, setiap pergantian bulan meninggalkan satu
 * gambar menggantung di memori tab selama sesi berjalan.
 */
export function createObjectUrl(blob: () => Blob | undefined) {
	let objectUrl = $state<string | null>(null);

	$effect(() => {
		const value = blob();
		if (!value) {
			objectUrl = null;
			return;
		}

		const nextUrl = URL.createObjectURL(value);
		objectUrl = nextUrl;

		return () => {
			URL.revokeObjectURL(nextUrl);
			objectUrl = null;
		};
	});

	return {
		get current() {
			return objectUrl;
		}
	};
}
