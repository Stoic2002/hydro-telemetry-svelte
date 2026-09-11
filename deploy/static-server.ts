/**
 * Penyaji berkas statis untuk hasil build SvelteKit (adapter-static).
 *
 *   bun deploy/static-server.ts --dir dist --port 4173
 *   bun deploy/static-server.ts --dir dist-staging --port 4174 --api http://127.0.0.1:18000
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
 *
 * Kenapa ada `--api`?
 *
 * Bila `VITE_API_BASE_URL` berisi URL absolut, browser pengguna yang menghubungi
 * backend secara langsung. Alamat backend yang dulu dipakai staging adalah IP
 * Tailscale (`100.x`): berfungsi lewat VPN, tetapi tidak dapat dijangkau dari
 * WiFi kantor. Dengan `--api`, request ke `/api/*` — termasuk WebSocket
 * monitoring — diteruskan server ini ke backend, sehingga browser cukup bisa
 * menjangkau port frontend dan CORS tidak terlibat. Pasangannya
 * `VITE_API_BASE_URL=/` saat build.
 */

const KNOWN_FLAGS = new Set(['--dir', '--port', '--api']);

const args = new Map<string, string>();
for (let index = 0; index < Bun.argv.length; index += 1) {
	const flag = Bun.argv[index];
	if (KNOWN_FLAGS.has(flag)) {
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
	console.error(
		'Pemakaian: bun deploy/static-server.ts --dir <direktori> --port <port> [--api <origin-backend>]'
	);
	process.exit(1);
}

/**
 * Hanya origin yang diterima. Setiap endpoint sudah memuat `/api/v1`, jadi path
 * pada nilai ini akan tergandakan — kesalahan yang sama yang dicegat
 * `hasDuplicateApiPrefix` untuk `VITE_API_BASE_URL`.
 */
function parseApiOrigin(value: string | undefined): string | null {
	if (value === undefined) return null;

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		console.error(`--api bukan URL yang valid: ${value}`);
		process.exit(1);
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		console.error('--api harus memakai http:// atau https://');
		process.exit(1);
	}

	if (url.pathname !== '/' || url.search) {
		console.error('--api cukup berisi origin (mis. http://127.0.0.1:18000), tanpa path');
		process.exit(1);
	}

	return url.origin;
}

const apiOrigin = parseApiOrigin(args.get('--api'));

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

function isApiPath(pathname: string): boolean {
	return pathname === '/api' || pathname.startsWith('/api/');
}

async function proxyHttp(request: Request, target: URL, clientAddress?: string): Promise<Response> {
	const headers = new Headers(request.headers);
	// Host diisi ulang oleh fetch sesuai tujuan; host yang dibuka pengguna tetap
	// sampai ke backend lewat X-Forwarded-Host.
	headers.delete('host');
	headers.set('x-forwarded-host', request.headers.get('host') ?? '');
	headers.set('x-forwarded-proto', 'http');
	if (clientAddress) headers.set('x-forwarded-for', clientAddress);

	try {
		const upstream = await fetch(target, {
			method: request.method,
			headers,
			body: request.body,
			redirect: 'manual',
			// Body diteruskan apa adanya. Bila fetch membongkar gzip, header
			// Content-Encoding yang ikut diteruskan membuat browser mencoba
			// membongkarnya sekali lagi.
			decompress: false
		});

		return new Response(upstream.body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: upstream.headers
		});
	} catch (error) {
		// Hanya pesannya yang dicatat. Objek error Bun memuat URL lengkap, dan query
		// string beberapa endpoint membawa token.
		const reason = error instanceof Error ? error.message : String(error);
		console.error(`Proxy ${request.method} ${target.pathname} gagal: ${reason}`);
		return Response.json(
			{ detail: 'Backend tidak dapat dijangkau dari server frontend' },
			{ status: 502 }
		);
	}
}

interface SocketData {
	target: string;
	upstream: WebSocket | null;
	/** Pesan dari browser yang tiba sebelum koneksi ke backend terbuka. */
	pending: (string | Uint8Array)[];
}

/**
 * Kode yang sah muncul di frame close. 1005, 1006, dan 1015 hanya dilaporkan
 * secara lokal — misalnya 1006 saat backend tidak terjangkau — dan tidak boleh
 * dikirim ke peer.
 */
function isSendableCloseCode(code: number): boolean {
	return (
		(code >= 1000 && code <= 1003) ||
		(code >= 1007 && code <= 1014) ||
		(code >= 3000 && code <= 4999)
	);
}

Bun.serve<SocketData>({
	port,
	hostname: '0.0.0.0',
	// Bawaan Bun menutup koneksi yang diam 10 detik, termasuk yang sedang
	// menunggu jawaban backend lewat proxy. 255 adalah batas atas yang diizinkan.
	idleTimeout: 255,
	async fetch(request, server) {
		const url = new URL(request.url);
		const { pathname } = url;

		// Lintasan path ke luar direktori build ditolak sebelum menyentuh disk.
		if (pathname.includes('..')) {
			return new Response('Not found', { status: 404 });
		}

		if (isApiPath(pathname)) {
			// Tanpa ini request API jatuh ke fallback SPA dan mendapat index.html
			// berstatus 200, yang baru gagal jauh di dalam aplikasi.
			if (!apiOrigin) {
				return Response.json(
					{ detail: 'Proxy API tidak aktif. Jalankan server dengan --api <origin-backend>' },
					{ status: 404 }
				);
			}

			const target = new URL(`${pathname}${url.search}`, apiOrigin);

			if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
				target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
				const upgraded = server.upgrade(request, {
					data: { target: target.toString(), upstream: null, pending: [] }
				});
				return upgraded ? undefined : new Response('Upgrade WebSocket gagal', { status: 400 });
			}

			return proxyHttp(request, target, server.requestIP(request)?.address);
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
	},
	websocket: {
		open(ws) {
			const upstream = new WebSocket(ws.data.target);
			upstream.binaryType = 'arraybuffer';
			ws.data.upstream = upstream;

			upstream.addEventListener('open', () => {
				for (const message of ws.data.pending) upstream.send(message);
				ws.data.pending = [];
			});
			upstream.addEventListener('message', (event) => {
				ws.send(event.data);
			});
			upstream.addEventListener('error', () => {
				// URL tidak dicatat karena membawa access token.
				console.error('WebSocket ke backend gagal');
			});
			// Kode dari backend diteruskan utuh supaya klien tetap bisa membedakan
			// penolakan autentikasi (4401/4403/1008) dari putus koneksi biasa.
			upstream.addEventListener('close', (event) => {
				ws.close(isSendableCloseCode(event.code) ? event.code : 1011, event.reason);
			});
		},
		message(ws, message) {
			const { upstream } = ws.data;
			if (upstream?.readyState === WebSocket.OPEN) upstream.send(message);
			else ws.data.pending.push(message);
		},
		close(ws, code, reason) {
			const { upstream } = ws.data;
			if (!upstream || upstream.readyState >= WebSocket.CLOSING) return;
			// WebSocket sisi klien hanya boleh menutup dengan 1000 atau 3000–4999.
			const forwardedCode = code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000;
			upstream.close(forwardedCode, reason);
		}
	}
});

console.log(
	`Menyajikan ${rootDir} pada http://0.0.0.0:${port}` +
		(apiOrigin ? `, /api diteruskan ke ${apiOrigin}` : '')
);
