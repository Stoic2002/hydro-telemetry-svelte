<script lang="ts">
	import IconFlask from '~icons/ph/flask';
	import IconPlus from '~icons/ph/plus';
	import IconTrash from '~icons/ph/trash';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select, { type SelectOption } from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import InfoTip from '$components/ui/InfoTip.svelte';
	import { formatDayMonthYearTimeWIB } from '$shared/lib/date';
	import { formatNumber } from '$shared/utils/number';
	import { createTestFormulaMutation } from '../api/queries';
	import { getTagSaveErrorDetail } from '../error';
	import {
		FORMULA_EXPRESSION_MAX_LENGTH,
		FORMULA_TAKE_LABELS,
		FORMULA_VARIABLE_LIMIT,
		createFormulaVariableRow,
		formulaFormFrom,
		type FormulaFormErrors,
		type FormulaFormValues
	} from '../formula-form';
	import type { FormulaDictionary, FormulaTestResult, TagFormula, TagFormulaTake } from '../model';

	interface Props {
		values: FormulaFormValues;
		/** Kosong sampai pengguna menekan Simpan atau Uji rumus. */
		errors: FormulaFormErrors;
		dictionary?: FormulaDictionary;
		/** Pilihan parameter deret, dari katalog `GET /parameter`. */
		parameterOptions: SelectOption[];
		disabled: boolean;
		pltaId: string;
		/** Kode rumus yang sedang diisi; dikirim saat menguji (rujukan melingkar). */
		code: string;
		/** Rumus yang lolos pemeriksaan lokal; `null` = belum bisa diuji. */
		formula: TagFormula | null;
		/** Dipanggil saat Uji rumus ditekan dengan isian yang belum lengkap. */
		onInvalidTest: () => void;
	}

	let {
		values = $bindable(),
		errors,
		dictionary,
		parameterOptions,
		disabled,
		pltaId,
		code,
		formula,
		onInvalidTest
	}: Props = $props();

	/**
	 * Editor rumus kustom (Swagger 9 Nov 2026): ekspresi + variabel, lalu Uji
	 * rumus untuk menghitungnya dengan data saat ini tanpa menyimpan. Server
	 * memeriksa dengan aturan yang sama persis dengan saat disimpan, jadi hasil
	 * uji tanpa masalah = rumus siap disimpan.
	 */
	const testMutation = createTestFormulaMutation();
	let testResult = $state<FormulaTestResult | null>(null);
	let testError = $state<string | null>(null);
	/** Rumus yang terakhir diuji; hasilnya basi begitu isian berubah. */
	let testedSignature = $state('');
	const signature = $derived(JSON.stringify({ formula, code }));
	const isTestStale = $derived(testResult !== null && testedSignature !== signature);

	const SOURCE_OPTIONS: SelectOption[] = [
		{ value: 'series', label: 'Deret' },
		{ value: 'constant', label: 'Konstanta' }
	];
	const SOURCE_LABELS: Record<FormulaTestResult['variables'][number]['source'], string> = {
		deret: 'deret',
		bawaan: 'nilai pengganti',
		konstanta: 'konstanta',
		kosong: 'kosong'
	};

	const seriesOptions = $derived<SelectOption[]>([
		...parameterOptions,
		{ value: 'rumus', label: 'Hasil rumus lain · rumus' }
	]);
	const takeOptions = $derived<SelectOption[]>(
		(Object.keys(FORMULA_TAKE_LABELS) as TagFormulaTake[]).map((take) => ({
			value: take,
			label: FORMULA_TAKE_LABELS[take]
		}))
	);
	const constantOptions = $derived<SelectOption[]>(
		(dictionary?.constants ?? []).map((constant) => ({ value: constant, label: constant }))
	);
	const takeHint = $derived(
		dictionary?.takeModes.map((mode) => `${mode.name}: ${mode.description}`).join(' · ') ||
			'Nilai terbaru = nilai terakhir ≤ 3 jam · Rata-rata jam lalu = rata-rata jam yang baru berakhir · Titik terakhir hari ini = untuk Target TMA dan rencana.'
	);
	const variableLimit = $derived(dictionary?.limits.variabel ?? FORMULA_VARIABLE_LIMIT);

	function addVariable() {
		values.variables = [...values.variables, createFormulaVariableRow()];
	}

	function removeVariable(id: string) {
		values.variables = values.variables.filter((row) => row.id !== id);
	}

	function useExample() {
		if (dictionary) values = formulaFormFrom(dictionary.example);
	}

	async function runTest() {
		if (!formula) {
			onInvalidTest();
			return;
		}
		testError = null;
		try {
			testResult = await testMutation.mutateAsync({ pltaId, formula, code: code || undefined });
			testedSignature = signature;
		} catch (error) {
			testResult = null;
			testError = getTagSaveErrorDetail(error).message;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-1.5">
				<label for="formula-expression" class="field-label">Ekspresi</label>
				<InfoTip label="Fungsi dan operator rumus">
					{#if dictionary}
						<span class="flex flex-col gap-1.5">
							<span>Operator: <span class="font-mono">{dictionary.operators.join(' ')}</span></span>
							{#each dictionary.functions as fn (fn.name)}
								<span><span class="font-mono">{fn.name}</span> — {fn.description}</span>
							{/each}
						</span>
					{:else}
						Angka, + - * / % **, perbandingan, and/or/not, dan fungsi min max abs sqrt round jika.
					{/if}
				</InfoTip>
			</div>
			{#if dictionary}
				<button
					type="button"
					{disabled}
					onclick={useExample}
					class="cursor-pointer text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
				>
					Pakai contoh
				</button>
			{/if}
		</div>
		<textarea
			id="formula-expression"
			rows="3"
			maxlength={FORMULA_EXPRESSION_MAX_LENGTH}
			placeholder="jika(b > 1, a / b * 3.6, 0)"
			bind:value={values.expression}
			{disabled}
			aria-invalid={errors.expression ? 'true' : undefined}
			aria-describedby={errors.expression ? 'formula-expression-error' : undefined}
			class={`field min-h-20 py-2 font-mono text-xs ${errors.expression ? 'field-invalid' : ''}`}
		></textarea>
		{#if errors.expression}
			<span id="formula-expression-error" class="text-xs font-medium text-status-danger-strong">
				{errors.expression}
			</span>
		{/if}
	</div>

	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-1.5">
				<h4 class="field-label">Variabel</h4>
				<InfoTip
					label="Keterangan variabel"
					text="Setiap nama di ekspresi harus dideklarasikan di sini, dan setiap variabel harus dipakai. Deret membaca parameter PLTA ini; konstanta membaca konstanta efektif PLTA."
				/>
			</div>
			<span class="text-xs text-text-muted">{values.variables.length} dari {variableLimit}</span>
		</div>
		{#if errors.variables}
			<span class="text-xs font-medium text-status-danger-strong">{errors.variables}</span>
		{/if}

		{#each values.variables as row, index (row.id)}
			{@const rowErrors = errors.rows[row.id] ?? {}}
			<div class="flex flex-col gap-3 rounded-xl border border-border-subtle p-3">
				<div class="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
					<Input
						label="Nama"
						placeholder="a"
						bind:value={row.name}
						{disabled}
						error={rowErrors.name}
						class="font-mono"
					/>
					<Select label="Sumber" bind:value={row.kind} options={SOURCE_OPTIONS} {disabled} />
					<button
						type="button"
						{disabled}
						onclick={() => removeVariable(row.id)}
						aria-label={`Hapus variabel ${row.name || index + 1}`}
						class="mb-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-strong disabled:cursor-not-allowed disabled:opacity-50"
					>
						<IconTrash class="size-4" />
					</button>
				</div>

				{#if row.kind === 'series'}
					<div class="grid gap-3 sm:grid-cols-2">
						<Select
							label="Parameter"
							placeholder="Pilih parameter"
							bind:value={row.parameter}
							options={seriesOptions}
							{disabled}
							error={rowErrors.parameter}
						/>
						<Input
							label={row.parameter === 'rumus' ? 'Kode rumus' : 'Station (opsional)'}
							placeholder={row.parameter === 'rumus' ? 'mis. EFISIENSI_TOTAL' : 'mis. T1'}
							bind:value={row.station}
							{disabled}
							hint="Kosongkan untuk seri tingkat pembangkit."
						/>
						<Select
							label="Ambil"
							bind:value={row.take}
							options={takeOptions}
							{disabled}
							hint={takeHint}
						/>
						<Input
							label="Pengganti bila kosong (opsional)"
							type="number"
							step="any"
							placeholder="Tidak dihitung"
							bind:value={row.fallback}
							{disabled}
							hint="Mis. 0 untuk pintu tertutup. Kosong = rumus tidak dihitung pada jam deret ini kosong."
						/>
					</div>
				{:else}
					<Select
						label="Konstanta"
						placeholder={constantOptions.length > 0 ? 'Pilih konstanta' : 'Kamus belum termuat'}
						bind:value={row.constant}
						options={constantOptions}
						{disabled}
						error={rowErrors.constant}
					/>
				{/if}
			</div>
		{/each}

		<button
			type="button"
			disabled={disabled || values.variables.length >= variableLimit}
			onclick={addVariable}
			class="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
		>
			<IconPlus class="size-4" />
			Tambah variabel
		</button>
	</div>

	<div class="flex flex-col gap-3 rounded-xl bg-surface-base p-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
				Uji rumus
				<InfoTip
					label="Keterangan uji rumus"
					text="Menghitung rumus dengan data jam berjalan tanpa menyimpan apa pun. Pemeriksaannya sama persis dengan saat disimpan."
				/>
			</span>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				disabled={disabled || testMutation.isPending}
				onclick={() => void runTest()}
			>
				{#snippet leftIcon()}<IconFlask class="size-3.5" />{/snippet}
				{testMutation.isPending ? 'Menguji…' : 'Uji rumus'}
			</Button>
		</div>

		{#if testError}
			<p class="text-xs font-medium text-status-danger-strong" role="alert">{testError}</p>
		{:else if testResult}
			<div class="flex flex-col gap-2" role="status">
				{#if isTestStale}
					<p class="text-xs text-status-warning-strong">Rumus berubah sejak diuji — uji ulang.</p>
				{/if}
				{#if testResult.problems.length > 0}
					<Banner tone="danger" title="Rumus belum bisa disimpan">
						<ul class="list-disc pl-4">
							{#each testResult.problems as problem (problem)}<li>{problem}</li>{/each}
						</ul>
					</Banner>
				{:else}
					<p class="text-xs text-text-secondary">
						Hasil saat ini
						<span class="metric-value ml-1 text-sm text-text-primary">
							{formatNumber(testResult.value, 3)}
						</span>
						<span class="ml-1 text-text-muted"
							>· jam {formatDayMonthYearTimeWIB(testResult.time)}</span
						>
					</p>
				{/if}
				{#if testResult.variables.length > 0}
					<dl class="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 text-xs">
						{#each testResult.variables as variable (variable.name)}
							<dt class="font-mono text-text-secondary">{variable.name}</dt>
							<dd class="metric-value text-right text-text-primary">
								{formatNumber(variable.value, 3)}
							</dd>
							<dd
								class={variable.source === 'kosong'
									? 'text-status-warning-strong'
									: 'text-text-muted'}
							>
								{SOURCE_LABELS[variable.source]}
							</dd>
						{/each}
					</dl>
				{/if}
			</div>
		{/if}
	</div>
</div>
