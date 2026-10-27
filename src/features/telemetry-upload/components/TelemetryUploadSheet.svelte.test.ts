import { QueryClient } from '@tanstack/svelte-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '$shared/lib/download';
import { telemetryUploadRepository } from '../api/repository';
import type { DailyTelemetryUploadTarget } from '../model';
import Harness from './TelemetryUploadSheet.test-harness.svelte';

/**
 * Hapus data salah unggah tidak bisa dibatalkan, jadi yang dikunci: rentang
 * bawaan satu hari penuh, selalu lewat konfirmasi, station yang dipilih ikut
 * terkirim, dan rentang yang pasti ditolak server tidak dikirim.
 */

vi.mock('../api/repository', () => ({
	telemetryUploadRepository: {
		uploadPoints: vi.fn(),
		uploadExcel: vi.fn(),
		deletePoints: vi.fn(),
		downloadTemplate: vi.fn()
	}
}));

vi.mock('$shared/lib/download', () => ({ downloadBlob: vi.fn() }));

const repository = vi.mocked(telemetryUploadRepository);

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

const SPILLWAY: DailyTelemetryUploadTarget = {
	label: 'Rencana Debit Spillway',
	parameter: 'plan_outflow_spillway',
	unit: 'm3/s',
	stations: [
		{ station: 'G1', label: 'Pintu G1' },
		{ station: 'G2', label: 'Pintu G2' }
	]
};

function renderSheet(target = SPILLWAY) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onClose = vi.fn();
	render(Harness, { props: { queryClient, target, onClose } });
	return { onClose };
}

function submitButton() {
	const button = screen
		.getAllByRole('button', { name: 'Hapus Data' })
		.find((element) => element.getAttribute('type') === 'submit');
	if (!button) throw new Error('Tombol hapus tidak ditemukan');
	return button;
}

async function openDeleteTab(user: ReturnType<typeof userEvent.setup>) {
	const [tab] = screen.getAllByRole('button', { name: 'Hapus Data' });
	await user.click(tab);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('hapus data manual salah unggah', () => {
	it('menghapus satu hari penuh pada station terpilih setelah dikonfirmasi', async () => {
		const user = userEvent.setup();
		repository.deletePoints.mockResolvedValue({
			pltaId: PLTA_ID,
			parameter: 'plan_outflow_spillway',
			station: 'G1',
			pointsDeleted: 24
		});
		const { onClose } = renderSheet();

		await openDeleteTab(user);
		await user.click(submitButton());

		expect(repository.deletePoints).not.toHaveBeenCalled();
		const confirmation = await screen.findByRole('alertdialog');
		await user.click(within(confirmation).getByRole('button', { name: 'Ya, Hapus' }));

		await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
		expect(repository.deletePoints).toHaveBeenCalledWith({
			pltaId: PLTA_ID,
			parameter: 'plan_outflow_spillway',
			station: 'G1',
			start: '2026-10-15T00:00:00',
			end: '2026-10-15T23:59:00'
		});
	});

	it('tidak menghapus apa pun bila konfirmasi dibatalkan', async () => {
		const user = userEvent.setup();
		renderSheet();

		await openDeleteTab(user);
		await user.click(submitButton());
		const confirmation = await screen.findByRole('alertdialog');
		await user.click(within(confirmation).getByRole('button', { name: 'Batal' }));

		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
		expect(repository.deletePoints).not.toHaveBeenCalled();
	});

	it('panel tetap terbuka bila rentang itu tidak berisi data manual', async () => {
		const user = userEvent.setup();
		repository.deletePoints.mockResolvedValue({
			pltaId: PLTA_ID,
			parameter: 'plan_outflow_spillway',
			station: 'G1',
			pointsDeleted: 0
		});
		const { onClose } = renderSheet();

		await openDeleteTab(user);
		await user.click(submitButton());
		const confirmation = await screen.findByRole('alertdialog');
		await user.click(within(confirmation).getByRole('button', { name: 'Ya, Hapus' }));

		await waitFor(() => expect(repository.deletePoints).toHaveBeenCalledOnce());
		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
		expect(onClose).not.toHaveBeenCalled();
	});

	it('menahan rentang terbalik sebelum sampai ke server', async () => {
		const user = userEvent.setup();
		renderSheet();

		await openDeleteTab(user);
		const [fromDate] = screen.getAllByLabelText('Tanggal');
		await fireEvent.input(fromDate, { target: { value: '2026-10-16' } });

		expect(
			await screen.findByText('Waktu akhir harus sama dengan atau setelah waktu awal')
		).toBeInTheDocument();
		expect(submitButton()).toBeDisabled();
	});
});

describe('template upload satu parameter', () => {
	it('mengunduh template hari panel untuk station terpilih', async () => {
		const user = userEvent.setup();
		const blob = new Blob(['xlsx']);
		repository.downloadTemplate.mockResolvedValue(blob);
		renderSheet();

		await user.click(screen.getByRole('button', { name: 'Upload Excel' }));
		await user.click(screen.getByRole('button', { name: 'Unduh Template' }));

		await waitFor(() =>
			expect(repository.downloadTemplate).toHaveBeenCalledWith({
				pltaId: PLTA_ID,
				parameter: 'plan_outflow_spillway',
				station: 'G1',
				scope: 'day-hourly',
				date: '2026-10-15'
			})
		);
		expect(vi.mocked(downloadBlob)).toHaveBeenCalledWith(
			blob,
			'template-plan_outflow_spillway-G1-2026-10-15.xlsx'
		);
	});
});

describe('parameter konstanta', () => {
	const TMA_LIMPAS: DailyTelemetryUploadTarget = {
		label: 'TMA Limpas',
		parameter: 'const_tma_limpas',
		unit: 'mdpl',
		stations: [{ station: '', label: 'Default' }]
	};

	it('hanya meminta nilai: tanpa tanggal, tanpa tab Excel dan Hapus', async () => {
		const user = userEvent.setup();
		repository.uploadPoints.mockResolvedValue({
			pltaId: PLTA_ID,
			parameter: 'const_tma_limpas',
			pointsUpserted: 1,
			filename: null
		});
		const { onClose } = renderSheet(TMA_LIMPAS);

		expect(screen.queryByLabelText('Tanggal')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Upload Excel' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Hapus Data' })).not.toBeInTheDocument();

		// Diisi lewat event input: jsdom membaca "231." di tengah ketikan sebagai
		// tidak sah dan mengosongkannya, sesuatu yang tidak terjadi di browser.
		await fireEvent.input(screen.getByRole('spinbutton', { name: /Nilai/ }), {
			target: { value: '231.5' }
		});
		await user.click(screen.getByRole('button', { name: 'Simpan Data' }));

		await waitFor(() => expect(repository.uploadPoints).toHaveBeenCalledTimes(1));
		const [input] = repository.uploadPoints.mock.calls[0];
		expect(input).toMatchObject({ parameter: 'const_tma_limpas', station: '' });
		expect(input.points).toHaveLength(1);
		expect(input.points[0].value).toBe(231.5);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});
});
