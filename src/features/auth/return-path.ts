/**
 * Alamat kembali setelah login.
 *
 * Sesi yang habis dulu selalu berakhir di Overview: guard mengalihkan ke
 * `/login` tanpa mengingat halaman asal, lalu login mengarah ke `/dashboard`.
 * Operator yang sedang mengisi Hidrologi Harian harus menavigasi ulang dari
 * awal. Sekarang halaman asal dibawa lewat `?kembali=` dan dipulihkan sesudah
 * login.
 */

export const RETURN_PATH_PARAM = 'kembali';
/** Ditambahkan saat sesi berakhir sendiri (bukan tombol Keluar), untuk pesan di layar login. */
export const SESSION_EXPIRED_PARAM = 'sesi';
export const SESSION_EXPIRED_VALUE = 'habis';

const DEFAULT_PATH = '/dashboard';

/**
 * Hanya alamat di dalam dashboard aplikasi ini yang diterima. Nilai dari URL
 * bisa diisi siapa saja, jadi `//situs-lain`, `https://…`, dan `/\…` (yang oleh
 * sebagian browser dibaca sebagai alamat protokol-relatif) ditolak — tanpa
 * pagar ini tautan login bisa dipakai untuk mengirim pengguna ke situs lain.
 */
export function safeReturnPath(raw: string | null | undefined): string {
	if (!raw) return DEFAULT_PATH;
	if (!raw.startsWith('/dashboard')) return DEFAULT_PATH;
	if (raw.startsWith('//') || raw.includes('\\')) return DEFAULT_PATH;
	const next = raw.charAt('/dashboard'.length);
	if (next !== '' && next !== '/' && next !== '?' && next !== '#') return DEFAULT_PATH;
	return raw;
}

/**
 * Alamat login yang membawa halaman asal. Halaman asal `/dashboard` saja tidak
 * dibawa — itu sudah tujuan bawaan, dan URL login yang bersih lebih mudah dibaca.
 */
export function loginPath(from?: URL | null, options: { expired?: boolean } = {}): string {
	const params = new URLSearchParams();
	const returnTo = from ? `${from.pathname}${from.search}` : '';
	if (returnTo && safeReturnPath(returnTo) === returnTo && returnTo !== DEFAULT_PATH) {
		params.set(RETURN_PATH_PARAM, returnTo);
	}
	if (options.expired) params.set(SESSION_EXPIRED_PARAM, SESSION_EXPIRED_VALUE);

	const query = params.toString();
	return query ? `/login?${query}` : '/login';
}
