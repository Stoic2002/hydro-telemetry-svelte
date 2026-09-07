import type { ZodType } from 'zod';

/**
 * Form terkontrol dengan validasi Zod. Pengganti `react-hook-form` +
 * `zodResolver` di versi React.
 *
 * `sveltekit-superforms` sempat direncanakan untuk peran ini, tetapi nilai
 * utamanya — form action di sisi server dan progressive enhancement — tidak ada
 * di aplikasi ini: seluruhnya SPA dan berbicara ke API terpisah. Yang tersisa
 * hanya perkawinan Zod dengan state field, dan itu cukup dikerjakan runes dalam
 * beberapa puluh baris di bawah ini.
 *
 * Skema yang dipakai sama persis dengan versi React, jadi pesan validasinya pun
 * tidak berubah.
 */
export class Form<TValues extends Record<string, unknown>, TOutput> {
	values = $state({}) as TValues;
	errors = $state<Partial<Record<keyof TValues & string, string>>>({});
	isSubmitting = $state(false);

	#schema: ZodType<TOutput>;
	#initial: TValues;
	#onSubmit: (values: TOutput) => Promise<void> | void;

	constructor(options: {
		schema: ZodType<TOutput>;
		initial: TValues;
		onSubmit: (values: TOutput) => Promise<void> | void;
	}) {
		this.#schema = options.schema;
		this.#initial = options.initial;
		this.#onSubmit = options.onSubmit;
		this.values = { ...options.initial };
	}

	/** Hasil validasi terkini — dipakai untuk menonaktifkan tombol simpan. */
	get isValid(): boolean {
		return this.#schema.safeParse(this.values).success;
	}

	/**
	 * Menyetel ulang nilai awal tanpa menghapus apa yang sedang diketik.
	 * Dipakai saat profil sesi baru selesai dimuat setelah form terpasang.
	 */
	setInitial(next: TValues): void {
		this.#initial = next;
		this.values = { ...next };
		this.errors = {};
	}

	reset(): void {
		this.values = { ...this.#initial };
		this.errors = {};
	}

	/** Menghapus pesan error satu field — dipanggil saat pengguna mengetik lagi. */
	clearError(field: keyof TValues & string): void {
		if (this.errors[field]) {
			this.errors = { ...this.errors, [field]: undefined };
		}
	}

	async submit(event?: SubmitEvent): Promise<void> {
		event?.preventDefault();

		const result = this.#schema.safeParse(this.values);

		if (!result.success) {
			const nextErrors: Partial<Record<keyof TValues & string, string>> = {};
			for (const issue of result.error.issues) {
				const field = issue.path[0];
				// Hanya pesan pertama per field yang ditampilkan; menumpuk beberapa
				// pesan di bawah satu field membuat tinggi form melompat-lompat.
				if (typeof field === 'string' && !nextErrors[field as keyof TValues & string]) {
					nextErrors[field as keyof TValues & string] = issue.message;
				}
			}
			this.errors = nextErrors;
			return;
		}

		this.errors = {};
		this.isSubmitting = true;
		try {
			await this.#onSubmit(result.data);
		} finally {
			this.isSubmitting = false;
		}
	}
}
