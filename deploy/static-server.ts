/**
 * Penyaji berkas statis untuk hasil build SvelteKit (adapter-static).
 *
 *   bun deploy/static-server.ts --dir dist --port 4173
 *
 * Kenapa bukan `vite preview` seperti versi React?
 *
 * Di project React, `vite preview --outDir dist-staging` menyajikan direktori
 * yang ditunjuk secara eksplisit. SvelteKit menjalankan preview-nya sendiri dan
 * mengabaikan `--outDir`: yang disajikan adalah hasil build terakhir, apa pun
 * itu. Dengan dua environment yang dibangun dari satu checkout, itu berarti
 * `systemctl restart` pada service staging bisa menyajikan bundle production —
 * persis jenis kesalahan diam yang dulu memunculkan `strictPort`.
 *
 * Server ini menerima direktori sebagai argumen dan tidak punya cara lain untuk
 * menyajikan direktori yang salah.
 */

const args = new Map<string, string>();
for (let index = 0; index < Bun.argv.length; index += 1) {
	const flag = Bun.argv[index];
	if (flag === '--dir' || flag === '--port') {
		const value = Bun.argv[index + 1];
		if (!value) {
			console.error(`Nilai untuk ${flag} tidak diberikan`);
			process.exit(1);
		}
		args.set(flag, value);
	}
}

const rootDir = args.get('--dir');
const port = Number(args.get('--port'));

if (!rootDir || !Number.isInteger(port)) {
	console.error('Pemakaian: bun deploy/static-server.ts --dir <direktori> --port <port>');
	process.exit(1);
}

const indexFile = Bun.file(`${rootDir}/index.html`);
if (!(await indexFile.exists())) {
	console.error(`${rootDir}/index.html tidak ada. Jalankan build lebih dulu.`);
	process.exit(1);
}

/**
 * Aset ber-hash aman di-cache selamanya; `index.html` tidak boleh di-cache sama
 * sekali supaya rilis baru langsung terpakai tanpa hard-refresh operator.
 */
function cacheControlFor(pathname: string): string {
	if (pathname.startsWith('/_app/immutable/')) return 'public, max-age=31536000, immutable';
	if (pathname.endsWith('.json')) return 'public, max-age=3600';
	return 'no-cache, no-store, must-revalidate';
}

Bun.serve({
	port,
	hostname: '0.0.0.0',
	async fetch(request) {
		const { pathname } = new URL(request.url);

		// Lintasan path ke luar direktori build ditolak sebelum menyentuh disk.
		if (pathname.includes('..')) {
			return new Response('Not found', { status: 404 });
		}

		const file = Bun.file(`${rootDir}${pathname}`);
		if (pathname !== '/' && (await file.exists())) {
			return new Response(file, {
				headers: { 'Cache-Control': cacheControlFor(pathname) }
			});
		}

		// Fallback SPA. Tanpa ini, refresh pada rute dalam seperti
		// /dashboard/plta/<id>/trends menghasilkan 404 — berkas dengan nama itu
		// memang tidak ada di disk.
		return new Response(indexFile, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	}
});

console.log(`Menyajikan ${rootDir} pada http://0.0.0.0:${port}`);
