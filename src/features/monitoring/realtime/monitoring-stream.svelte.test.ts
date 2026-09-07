import { QueryClient } from '@tanstack/svelte-query';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, refreshAuthSession } from '$api/http';
import { reportError } from '$shared/lib/report-error';
import { monitoringQueryKeys } from '../api/queries';
import type { PLTALatestMonitoring } from '../model';
import MonitoringStreamHarness from './MonitoringStream.test-harness.svelte';
import type { createMonitoringStream, MonitoringStreamOptions } from './monitoring-stream.svelte';

/**
 * Port dari `useMonitoringStream.test.tsx` di versi React.
 *
 * Yang dikunci: backoff eksponensial dengan jitter, batas percobaan, watchdog
 * untuk socket yang terbuka tapi berhenti mengirim data, dan refresh token saat
 * server menutup dengan kode autentikasi. Keempatnya hanya terlihat lewat
 * WebSocket palsu dan timer palsu — tidak ada jalur lain untuk mengujinya.
 */

// Modul `$api/http` juga dipakai repository monitoring, jadi hanya bagian sesi
// yang diganti; sisanya tetap implementasi aslinya.
vi.mock('$api/http', async (importOriginal) => ({
	...(await importOriginal<typeof import('$api/http')>()),
	getAccessToken: vi.fn(() => 'token-uji'),
	refreshAuthSession: vi.fn(async () => null),
	subscribeToAuthSession: vi.fn(() => () => {})
}));

vi.mock('$shared/lib/report-error', () => ({
	reportError: vi.fn()
}));

const getAccessTokenMock = vi.mocked(getAccessToken);
const refreshAuthSessionMock = vi.mocked(refreshAuthSession);
const reportErrorMock = vi.mocked(reportError);

/** `MAX_RECONNECT_DELAY_MS` di implementasi: batas atas jeda backoff. */
const MAX_BACKOFF_WITH_JITTER_MS = 30_000;

const PLTA_ID = '11111111-1111-4111-8111-111111111111';
const WS_ID = '22222222-2222-4222-8222-222222222222';

type FakeListener = (event: unknown) => void;

/** WebSocket palsu yang bisa dikendalikan penuh dari kasus uji. */
class FakeWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;
	static instances: FakeWebSocket[] = [];

	readyState = FakeWebSocket.CONNECTING;
	closeCode: number | null = null;
	// Objek biasa, bukan `Map`: kuncinya selalu string dan aturan
	// `svelte/prefer-svelte-reactivity` menolak `Map` yang dimutasi di berkas
	// `.svelte.ts`.
	private readonly listeners: Record<string, FakeListener[]> = {};

	constructor(readonly url: string) {
		FakeWebSocket.instances.push(this);
	}

	addEventListener(type: string, listener: FakeListener) {
		(this.listeners[type] ??= []).push(listener);
	}

	close(code?: number) {
		this.readyState = FakeWebSocket.CLOSED;
		this.closeCode = code ?? 1000;
	}

	private emit(type: string, event: unknown) {
		for (const listener of this.listeners[type] ?? []) listener(event);
	}

	simulateOpen() {
		this.readyState = FakeWebSocket.OPEN;
		this.emit('open', {});
	}

	simulateMessage(data: unknown) {
		this.emit('message', { data: JSON.stringify(data) });
	}

	simulateRawMessage(data: string) {
		this.emit('message', { data });
	}

	simulateClose(code: number, reason = '') {
		this.readyState = FakeWebSocket.CLOSED;
		this.emit('close', { code, reason });
	}

	static get latest(): FakeWebSocket {
		const socket = FakeWebSocket.instances.at(-1);
		if (!socket) throw new Error('belum ada koneksi WebSocket yang dibuat');
		return socket;
	}
}

const SNAPSHOT_PAYLOAD = {
	plta_id: PLTA_ID,
	parameters: [
		{
			parameter: 'water_level',
			station: 'ST-1',
			value: 231.5,
			time: '2026-08-20T07:00:00Z',
			quality: 'good'
		}
	]
};

let queryClient: QueryClient;

function renderStream(options: Partial<MonitoringStreamOptions> = {}) {
	let stream!: ReturnType<typeof createMonitoringStream>;

	const { unmount } = render(MonitoringStreamHarness, {
		props: {
			queryClient,
			options: { scope: 'plta', id: PLTA_ID, bootstrapLatest: false, ...options },
			onReady: (created: ReturnType<typeof createMonitoringStream>) => {
				stream = created;
			}
		}
	});

	return { stream, unmount };
}

/** Menjalankan timer terjadwal sekaligus menuntaskan promise yang tertunda. */
async function advance(ms: number) {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
}

/** Menuntaskan promise handler pesan tanpa memajukan waktu. */
async function settle() {
	await vi.advanceTimersByTimeAsync(0);
	flushSync();
}

function connectionUrl(): URL {
	return new URL(FakeWebSocket.latest.url);
}

beforeEach(() => {
	vi.useFakeTimers();
	FakeWebSocket.instances = [];
	vi.stubGlobal('WebSocket', FakeWebSocket);
	getAccessTokenMock.mockReturnValue('token-uji');
	refreshAuthSessionMock.mockResolvedValue(null);
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	queryClient.clear();
});

describe('siklus koneksi', () => {
	it('tidak menyambung saat dinonaktifkan', async () => {
		renderStream({ enabled: false });
		await advance(10);

		expect(FakeWebSocket.instances).toHaveLength(0);
	});

	it('tidak menyambung saat sesi tidak tersedia', async () => {
		getAccessTokenMock.mockReturnValue(null);
		const { stream } = renderStream();
		await advance(10);

		expect(FakeWebSocket.instances).toHaveLength(0);
		expect(stream.status).toBe('error');
	});

	it('menyambung dan menandai koneksi terbuka', async () => {
		const { stream } = renderStream();
		await advance(10);

		expect(FakeWebSocket.instances).toHaveLength(1);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		expect(stream.status).toBe('open');
	});

	it('menyertakan token dan lingkup pada URL koneksi', async () => {
		renderStream();
		await advance(10);

		const url = connectionUrl();
		expect(url.protocol).toMatch(/^wss?:$/);
		expect(url.searchParams.get('token')).toBe('token-uji');
		expect(url.searchParams.get('plta_id')).toBe(PLTA_ID);
	});

	it('memakai ws_id saat lingkupnya wilayah sungai', async () => {
		renderStream({ scope: 'river-basin', id: WS_ID });
		await advance(10);

		expect(connectionUrl().searchParams.get('ws_id')).toBe(WS_ID);
	});

	it('menutup koneksi saat komponen dilepas', async () => {
		const { unmount } = renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		const socket = FakeWebSocket.latest;
		unmount();

		expect(socket.closeCode).toBe(1000);
	});
});

describe('pesan masuk', () => {
	it('menulis pembacaan terbaru ke cache query', async () => {
		const { stream } = renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateMessage(SNAPSHOT_PAYLOAD);
		await settle();

		const cached = queryClient.getQueryData<PLTALatestMonitoring>(
			monitoringQueryKeys.pltaLatest(PLTA_ID)
		);
		expect(cached?.parameters[0]?.value).toBe(231.5);
		expect(stream.lastMessageAt).toBeInstanceOf(Date);
	});

	it('menggabungkan pembacaan baru tanpa menghapus parameter lain', async () => {
		renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();
		FakeWebSocket.latest.simulateMessage(SNAPSHOT_PAYLOAD);
		await settle();

		FakeWebSocket.latest.simulateMessage({
			plta_id: PLTA_ID,
			parameters: [
				{
					parameter: 'inflow',
					station: 'ST-2',
					value: 12,
					time: '2026-08-20T07:05:00Z',
					quality: 'good'
				}
			]
		});
		await settle();

		const cached = queryClient.getQueryData<PLTALatestMonitoring>(
			monitoringQueryKeys.pltaLatest(PLTA_ID)
		);
		// Pesan realtime bersifat parsial; parameter lama harus bertahan.
		expect(cached?.parameters.map((parameter) => parameter.parameter).sort()).toEqual([
			'inflow',
			'water_level'
		]);
	});

	it('melaporkan pesan yang tidak sesuai kontrak', async () => {
		const { stream } = renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateMessage({ tidak: 'dikenal' });
		await settle();

		expect(stream.error).toMatch(/tidak sesuai kontrak/i);
		expect(reportErrorMock).toHaveBeenCalled();
	});

	it('tidak roboh saat pesan bukan JSON', async () => {
		const { stream } = renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateRawMessage('bukan json');
		await settle();

		expect(stream.error).toMatch(/tidak dapat dibaca/i);
	});
});

describe('pemulihan koneksi', () => {
	it('menyambung ulang setelah putus tidak normal', async () => {
		renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateClose(1006);
		await advance(2_000);

		expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
	});

	it('tidak menyambung ulang setelah penutupan normal', async () => {
		const { stream } = renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateClose(1000);
		await advance(60_000);

		expect(FakeWebSocket.instances).toHaveLength(1);
		expect(stream.status).toBe('closed');
	});

	it('memperbarui sesi lebih dulu saat ditutup karena autentikasi', async () => {
		renderStream();
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		FakeWebSocket.latest.simulateClose(4401);
		await advance(2_000);

		expect(refreshAuthSessionMock).toHaveBeenCalled();
	});

	it('menaikkan jeda backoff secara eksponensial dan menahannya pada batas atas', async () => {
		// Jitter dibuat deterministik supaya jedanya bisa dibandingkan dengan
		// angka pasti; bahwa jitter memang dipakai diperiksa lewat pemanggilan
		// `Math.random` di bawah.
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

		renderStream();
		await advance(10);

		const delays: number[] = [];
		for (let attempt = 0; attempt < 8; attempt += 1) {
			const before = FakeWebSocket.instances.length;
			FakeWebSocket.latest.simulateClose(1006);

			let waited = 0;
			while (FakeWebSocket.instances.length === before && waited < 40_000) {
				await advance(100);
				waited += 100;
			}
			delays.push(waited);
		}

		// 1s, 2s, 4s, 8s, 16s — lalu tertahan pada MAX_RECONNECT_DELAY_MS 30s,
		// semuanya dikali jitter 0,8.
		expect(delays).toEqual([800, 1_600, 3_200, 6_400, 12_800, 24_000, 24_000, 24_000]);
		expect(Math.max(...delays)).toBeLessThanOrEqual(MAX_BACKOFF_WITH_JITTER_MS);
		// Tanpa jitter seluruh tab operator yang terputus bersamaan akan menyerbu
		// server pada detik yang sama.
		expect(randomSpy).toHaveBeenCalled();
	});

	it('menyerah setelah batas percobaan dan melaporkannya', async () => {
		const { stream } = renderStream();
		await advance(10);

		// Setiap percobaan gagal langsung; jeda backoff maksimum 30 detik.
		for (let attempt = 0; attempt < 10; attempt += 1) {
			FakeWebSocket.latest.simulateClose(1006);
			await advance(31_000);
		}

		expect(stream.status).toBe('error');
		expect(stream.error).toMatch(/gagal dipulihkan/i);
		expect(reportErrorMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringMatching(/menyerah/i) }),
			expect.objectContaining({ scope: 'realtime' })
		);
	});

	it('menyambung ulang atas permintaan setelah menyerah', async () => {
		const { stream } = renderStream();
		await advance(10);

		for (let attempt = 0; attempt < 10; attempt += 1) {
			FakeWebSocket.latest.simulateClose(1006);
			await advance(31_000);
		}
		const attemptsBefore = FakeWebSocket.instances.length;

		stream.reconnect();
		await advance(10);

		expect(FakeWebSocket.instances.length).toBeGreaterThan(attemptsBefore);
	});
});

describe('watchdog data basi', () => {
	it('menutup koneksi yang terbuka tetapi berhenti mengirim data', async () => {
		const { stream } = renderStream({ staleAfterMs: 5_000 });
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		const socket = FakeWebSocket.latest;
		await advance(5_100);

		// Socket hidup tanpa data adalah kegagalan diam-diam: operator melihat
		// angka lama tanpa satu pun tanda.
		expect(socket.closeCode).toBe(4000);
		expect(stream.error).toMatch(/berhenti diperbarui/i);
	});

	it('menunda watchdog setiap kali data baru datang', async () => {
		renderStream({ staleAfterMs: 5_000 });
		await advance(10);
		FakeWebSocket.latest.simulateOpen();
		await settle();

		const socket = FakeWebSocket.latest;
		await advance(4_000);
		socket.simulateMessage(SNAPSHOT_PAYLOAD);
		await settle();
		await advance(4_000);

		expect(socket.closeCode).toBeNull();
	});
});
