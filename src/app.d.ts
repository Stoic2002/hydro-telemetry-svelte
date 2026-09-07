// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/**
 * Ikon di-import sebagai modul virtual `~icons/<koleksi>/<nama>` dan di-compile
 * jadi komponen Svelte saat build. Referensi ini yang membuat TypeScript
 * mengenali jalur virtual tersebut.
 */
/// <reference types="unplugin-icons/types/svelte" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
