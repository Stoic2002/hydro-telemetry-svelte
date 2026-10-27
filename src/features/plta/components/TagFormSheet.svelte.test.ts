import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pltaRepository } from '../api/repository';
import Harness from './TagFormSheet.test-harness.svelte';

vi.mock('../api/repository', () => ({ pltaRepository: { createTag: vi.fn() } }));

const repository = vi.mocked(pltaRepository);

function renderSheet() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(Harness, { props: { queryClient } });
}

beforeEach(() => {
	document.body.removeAttribute('style');
	vi.clearAllMocks();
});

describe('sheet tambah parameter', () => {
	it('bawaan input manual: alamat terisi upload dan tanpa bidang REST', () => {
		renderSheet();

		expect(screen.getByRole('textbox', { name: 'Alamat' })).toHaveValue('upload');
		expect(screen.queryByRole('textbox', { name: /Header HTTP/ })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
	});

	it('isian tanpa parameter ditahan di form, tanpa permintaan ke server', async () => {
		const user = userEvent.setup();
		renderSheet();

		await user.type(screen.getByRole('textbox', { name: /Station/ }), 'G1');
		await user.click(screen.getByRole('button', { name: 'Tambah' }));

		expect(await screen.findByText('Pilih parameter.')).toBeInTheDocument();
		expect(repository.createTag).not.toHaveBeenCalled();
	});
});
