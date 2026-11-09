import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pltaRepository } from '../api/repository';
import { createFormulaVariableRow, emptyFormulaForm } from '../formula-form';
import Harness from './FormulaEditor.test-harness.svelte';

vi.mock('../api/repository', () => ({
	pltaRepository: { testFormula: vi.fn() }
}));

const repository = vi.mocked(pltaRepository);
const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function renderEditor(initial = emptyFormulaForm(), onInvalidTest = vi.fn()) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(Harness, { props: { queryClient, initial, onInvalidTest } });
	return { onInvalidTest };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('editor rumus kustom', () => {
	it('isian belum lengkap: Uji rumus menampilkan galat form, tanpa permintaan ke server', async () => {
		const user = userEvent.setup();
		const { onInvalidTest } = renderEditor();

		await user.click(screen.getByRole('button', { name: 'Uji rumus' }));

		expect(onInvalidTest).toHaveBeenCalledTimes(1);
		expect(repository.testFormula).not.toHaveBeenCalled();
	});

	it('menguji rumus dengan kode yang diisi dan menampilkan hasil beserta sumber tiap variabel', async () => {
		const user = userEvent.setup();
		repository.testFormula.mockResolvedValue({
			value: 12.5,
			time: '2026-11-09T14:00:00+07:00',
			variables: [{ name: 'a', value: null, time: null, source: 'kosong' }],
			problems: []
		});
		renderEditor({
			expression: 'a * 2',
			variables: [createFormulaVariableRow({ name: 'a', parameter: 'beban' })]
		});

		await user.click(screen.getByRole('button', { name: 'Uji rumus' }));

		expect(repository.testFormula).toHaveBeenCalledWith(
			PLTA_ID,
			{
				expression: 'a * 2',
				variables: {
					a: { kind: 'series', parameter: 'beban', station: '', take: 'terbaru', fallback: null }
				}
			},
			'EFISIENSI'
		);
		expect(await screen.findByText('12,500')).toBeInTheDocument();
		expect(screen.getByText('kosong')).toBeInTheDocument();
	});

	it('menampilkan masalah dari server sebagai alasan belum bisa disimpan', async () => {
		const user = userEvent.setup();
		repository.testFormula.mockResolvedValue({
			value: null,
			time: '2026-11-09T14:00:00+07:00',
			variables: [],
			problems: ['Variabel b dipakai tetapi tidak dideklarasikan.']
		});
		renderEditor({
			expression: 'a * b',
			variables: [createFormulaVariableRow({ name: 'a', parameter: 'beban' })]
		});

		await user.click(screen.getByRole('button', { name: 'Uji rumus' }));

		expect(await screen.findByText('Rumus belum bisa disimpan')).toBeInTheDocument();
		expect(screen.getByText('Variabel b dipakai tetapi tidak dideklarasikan.')).toBeInTheDocument();
	});

	it('menambah dan menghapus variabel', async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(screen.getByRole('button', { name: 'Tambah variabel' }));
		expect(screen.getAllByRole('textbox', { name: 'Nama' })).toHaveLength(2);

		await user.click(screen.getByRole('button', { name: 'Hapus variabel 2' }));
		expect(screen.getAllByRole('textbox', { name: 'Nama' })).toHaveLength(1);
	});
});
