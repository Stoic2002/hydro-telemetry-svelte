import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterAll, afterEach } from 'vitest';

// jsdom belum menyediakan ResizeObserver, sementara peta memakainya untuk
// menyesuaikan skala proyeksi terhadap lebar kontainer. Pengganti kosong sudah
// cukup: ukuran awal tetap diambil dari getBoundingClientRect.
if (!('ResizeObserver' in globalThis)) {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
}

// jsdom juga belum punya `matchMedia`, padahal `svelte/motion` (dipakai
// layerchart untuk animasi grafik) memanggilnya saat modul dimuat. Pengganti
// ini melapor "tidak cocok" untuk semua query, termasuk `prefers-reduced-motion`.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false
		})
	});
}

afterEach(() => {
	cleanup();
});

// bits-ui melepas kunci scroll `body` lewat timer ±24 ms sesudah dialog/sheet
// ditutup. Bila berkas test selesai lebih dulu, timer itu berjalan sesudah
// jsdom dibongkar dan melempar `document is not defined` sebagai galat tak
// tertangani — `bun run check` gagal kira-kira 1 dari 3 kali walau semua test
// lulus. Menunggu sekali di akhir tiap berkas memberinya waktu.
afterAll(() => new Promise((resolve) => setTimeout(resolve, 50)));
