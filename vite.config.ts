import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';

/**
 * Port dipatok per mode supaya production dan staging tidak pernah tertukar di
 * browser: 5173/4173 untuk production, 5174/4174 untuk staging.
 *
 * `strictPort` sengaja dinyalakan. Perilaku bawaan Vite adalah diam-diam pindah
 * ke port berikutnya bila port terpakai — persis kejadian yang membuat kedua
 * lingkungan tertukar. Lebih baik gagal keras.
 */
const SERVER_PORTS = {
	staging: { dev: 5174, preview: 4174 },
	default: { dev: 5173, preview: 4173 }
} as const;

function portsForMode(mode: string) {
	return mode === 'staging' ? SERVER_PORTS.staging : SERVER_PORTS.default;
}

/**
 * Host tambahan untuk dev server dibaca dari environment, bukan ditulis di sini.
 * Alamat tunnel berganti tiap sesi, dan sebelumnya setiap pergantian memaksa
 * commit baru pada file konfigurasi.
 */
function readAllowedHosts(mode: string): string[] {
	const { VITE_DEV_ALLOWED_HOSTS } = loadEnv(mode, process.cwd(), 'VITE_');

	return (VITE_DEV_ALLOWED_HOSTS ?? '')
		.split(',')
		.map((host) => host.trim())
		.filter(Boolean);
}

export default defineConfig(({ mode }) => ({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			/**
			 * Aplikasi dibangun sebagai SPA statis, bukan SSR.
			 *
			 * Alasannya bukan selera: token sesi disimpan di `sessionStorage`,
			 * monitoring realtime memakai WebSocket dari sisi klien, dan
			 * `VITE_API_BASE_URL` ikut ter-bundle saat build supaya production dan
			 * staging menghasilkan dua direktori yang berbeda isinya. Tidak satu pun
			 * dari itu punya padanan di sisi server.
			 *
			 * Keluarannya tetap direktori statis, jadi `deploy/nginx.conf` dan unit
			 * systemd yang sudah ada tidak perlu diubah.
			 *
			 * `fallback` wajib ada — tanpa itu rute dalam seperti
			 * `/dashboard/plta/:id/telemetering/harian` akan 404 saat di-refresh.
			 */
			adapter: adapter({
				pages: mode === 'staging' ? 'dist-staging' : 'dist',
				assets: mode === 'staging' ? 'dist-staging' : 'dist',
				fallback: 'index.html',
				precompress: false,
				strict: false
			}),

			/**
			 * `$app` sudah dipesan SvelteKit (`$app/state`, `$app/navigation`), jadi
			 * composition root tinggal di `src/core` dan memakai `$core`. Sebelumnya
			 * folder itu bernama `src/app` dan terpaksa diimpor lewat path relatif
			 * sepanjang `../../../../../app/guards`.
			 */
			alias: {
				$api: 'src/api',
				$components: 'src/components',
				$core: 'src/core',
				$features: 'src/features',
				$shared: 'src/shared'
			}
		}),

		/**
		 * Ikon di-compile menjadi komponen Svelte saat build, bukan diambil dari
		 * api.iconify.design saat runtime. Dashboard ini dijalankan di LAN dan lewat
		 * tunnel; varian runtime akan menampilkan kotak kosong begitu jaringan luar
		 * tidak tersedia.
		 */
		Icons({ compiler: 'svelte', autoInstall: false })
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				/**
				 * Tanpa ini Svelte ter-resolve ke build server-nya dan `mount()` tidak
				 * tersedia, karena plugin SvelteKit menyalakan kondisi SSR secara
				 * bawaan. Uji komponen berjalan di jsdom, jadi yang dibutuhkan build
				 * browser.
				 */
				resolve: { conditions: ['browser'] },
				test: {
					/**
					 * Komponen diuji di jsdom, bukan browser sungguhan. Dari 26 berkas uji
					 * di versi React hanya 8 yang menyentuh DOM, dan kedelapannya sudah
					 * lulus di jsdom — browser mode hanya menambah unduhan 130 MB pada
					 * setiap mesin dan setiap runner CI tanpa menutup bug yang nyata.
					 */
					name: 'client',
					environment: 'jsdom',
					setupFiles: ['./src/test/setup.ts'],
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					clearMocks: true,
					restoreMocks: true
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					clearMocks: true,
					restoreMocks: true
				}
			}
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: './coverage',
			exclude: ['src/test/**', '**/*.{test,spec}.{js,ts}']
		}
	},
	server: {
		port: portsForMode(mode).dev,
		strictPort: true,
		allowedHosts: readAllowedHosts(mode)
	},
	preview: {
		port: portsForMode(mode).preview,
		strictPort: true
	}
}));
