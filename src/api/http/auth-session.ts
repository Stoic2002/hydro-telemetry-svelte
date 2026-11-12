import { z } from 'zod';
import { ApiError } from './api-error';
import { buildApiUrl } from './url';

const AUTH_STORAGE_KEY = 'tele.auth.session';
const AUTH_CHANNEL_NAME = 'tele.auth.events';

export const authTokensSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	token_type: z.string().min(1).default('bearer')
});

export type AuthTokens = z.infer<typeof authTokensSchema>;
type SessionListener = (tokens: AuthTokens | null) => void;
interface ClearAuthTokensOptions {
	broadcast?: boolean;
}

let cachedTokens: AuthTokens | null | undefined;
let refreshPromise: Promise<AuthTokens | null> | null = null;
let sessionRevision = 0;
let authChannel: BroadcastChannel | null | undefined;
const listeners = new Set<SessionListener>();

/**
 * Berbagi sesi ke tab baru (temuan QA T1, disetujui 12 Nov 2026). Sesi tetap di
 * `sessionStorage` — menutup semua tab tetap berarti keluar — tetapi tab yang
 * dibuka lewat tautan tidak lagi meminta login ulang: ia bertanya ke tab lain
 * yang sedang login, dan tab itu membalas dengan tokennya.
 */
const SESSION_REQUEST_TIMEOUT_MS = 300;
let pendingSessionRequest: { id: string; resolve: (tokens: AuthTokens | null) => void } | null =
	null;

function notifySessionListeners(tokens: AuthTokens | null) {
	listeners.forEach((listener) => listener(tokens));
}

function resetLocalSession(): void {
	sessionRevision += 1;
	refreshPromise = null;
	cachedTokens = null;

	try {
		window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
	} catch {
		// No action is needed when browser storage is unavailable.
	}

	notifySessionListeners(null);
}

function getAuthChannel(): BroadcastChannel | null {
	if (authChannel !== undefined) return authChannel;

	if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
		authChannel = null;
		return authChannel;
	}

	authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
	authChannel.addEventListener('message', (event: MessageEvent<unknown>) => {
		handleChannelMessage(event.data);
	});

	return authChannel;
}

function handleChannelMessage(data: unknown): void {
	if (typeof data !== 'object' || data === null) return;
	const type = Reflect.get(data, 'type');

	if (type === 'logout') {
		resetLocalSession();
		return;
	}

	// Tab baru meminta sesi: hanya tab yang sedang login yang membalas.
	if (type === 'session-request') {
		const tokens = getAuthTokens();
		if (tokens) {
			authChannel?.postMessage({ type: 'session-share', id: Reflect.get(data, 'id'), tokens });
		}
		return;
	}

	if (type === 'session-share') {
		if (!pendingSessionRequest || Reflect.get(data, 'id') !== pendingSessionRequest.id) return;
		const parsed = authTokensSchema.safeParse(Reflect.get(data, 'tokens'));
		if (!parsed.success) return;
		const { resolve } = pendingSessionRequest;
		pendingSessionRequest = null;
		storeTokens(parsed.data);
		resolve(parsed.data);
		return;
	}

	// Tab lain merotasi refresh token sesi yang sama. Tanpa ini tab ini memegang
	// refresh token lama, refresh berikutnya ditolak, dan semua tab ikut keluar.
	// Tab yang login dengan akun lain (refresh token berbeda) tidak tersentuh.
	if (type === 'session-rotated') {
		const previous = Reflect.get(data, 'previousRefreshToken');
		const parsed = authTokensSchema.safeParse(Reflect.get(data, 'tokens'));
		if (parsed.success && previous && getAuthTokens()?.refresh_token === previous) {
			storeTokens(parsed.data);
		}
	}
}

/**
 * Meminta sesi dari tab lain yang sedang login. `null` bila tidak ada yang
 * membalas dalam ±300 ms — layar login tampil seperti biasa.
 */
export function requestSessionFromOtherTabs(
	timeoutMs = SESSION_REQUEST_TIMEOUT_MS
): Promise<AuthTokens | null> {
	const channel = getAuthChannel();
	if (!channel || getAuthTokens()) return Promise.resolve(getAuthTokens());

	pendingSessionRequest?.resolve(null);
	const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	return new Promise((resolve) => {
		pendingSessionRequest = { id, resolve };
		channel.postMessage({ type: 'session-request', id });
		setTimeout(() => {
			if (pendingSessionRequest?.id !== id) return;
			pendingSessionRequest = null;
			resolve(null);
		}, timeoutMs);
	});
}

function readStoredTokens(): AuthTokens | null {
	if (typeof window === 'undefined') return null;

	try {
		const serializedTokens = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
		if (!serializedTokens) return null;

		const parsedTokens = authTokensSchema.safeParse(JSON.parse(serializedTokens));
		if (parsedTokens.success) return parsedTokens.data;

		window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
		return null;
	} catch {
		return null;
	}
}

export function getAuthTokens(): AuthTokens | null {
	getAuthChannel();

	if (cachedTokens === undefined) {
		cachedTokens = readStoredTokens();
	}

	return cachedTokens;
}

export function getAccessToken(): string | null {
	return getAuthTokens()?.access_token ?? null;
}

export function setAuthTokens(tokens: AuthTokens): void {
	storeTokens(tokens);
}

/** Menyimpan sesi di tab ini saja, tanpa siaran. */
function storeTokens(tokens: AuthTokens): void {
	const validatedTokens = authTokensSchema.parse(tokens);
	sessionRevision += 1;
	cachedTokens = validatedTokens;

	try {
		window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(validatedTokens));
	} catch {
		// The in-memory session remains usable when browser storage is unavailable.
	}

	notifySessionListeners(validatedTokens);
}

export function clearAuthTokens({ broadcast = false }: ClearAuthTokensOptions = {}): void {
	resetLocalSession();
	if (broadcast) {
		getAuthChannel()?.postMessage({ type: 'logout' });
	}
}

export function subscribeToAuthSession(listener: SessionListener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

async function performTokenRefresh(): Promise<AuthTokens | null> {
	const currentTokens = getAuthTokens();
	if (!currentTokens) return null;

	const refreshRevision = sessionRevision;
	const currentRefreshToken = currentTokens.refresh_token;

	let response: Response;

	try {
		response = await fetch(buildApiUrl('/api/v1/auth/refresh'), {
			method: 'POST',
			cache: 'no-store',
			credentials: 'include',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ refresh_token: currentTokens.refresh_token })
		});
	} catch (error) {
		throw new ApiError('Tidak dapat memperbarui sesi karena server tidak terjangkau', {
			status: 0,
			statusText: 'Network Error',
			cause: error
		});
	}

	const payload: unknown = await response.json().catch(() => undefined);

	// A logout or a newer login happened while refresh was in flight.
	// Never let this stale response recreate a session that has been cleared.
	if (
		sessionRevision !== refreshRevision ||
		getAuthTokens()?.refresh_token !== currentRefreshToken
	) {
		return null;
	}

	if (!response.ok) {
		if (response.status === 401 || response.status === 422) {
			clearAuthTokens({ broadcast: true });
			return null;
		}

		throw new ApiError('Gagal memperbarui sesi', {
			status: response.status,
			statusText: response.statusText,
			details: payload,
			url: response.url
		});
	}

	const parsedTokens = authTokensSchema.safeParse(payload);
	if (!parsedTokens.success) {
		clearAuthTokens({ broadcast: true });
		throw new ApiError('Respons refresh token tidak sesuai kontrak', {
			status: 502,
			statusText: 'Invalid API Response',
			details: parsedTokens.error.flatten(),
			url: response.url
		});
	}

	setAuthTokens(parsedTokens.data);
	getAuthChannel()?.postMessage({
		type: 'session-rotated',
		previousRefreshToken: currentRefreshToken,
		tokens: parsedTokens.data
	});
	return parsedTokens.data;
}

export function refreshAuthSession(): Promise<AuthTokens | null> {
	if (!refreshPromise) {
		const pendingRefresh = performTokenRefresh();
		refreshPromise = pendingRefresh;

		void pendingRefresh.then(
			() => {
				if (refreshPromise === pendingRefresh) refreshPromise = null;
			},
			() => {
				if (refreshPromise === pendingRefresh) refreshPromise = null;
			}
		);
	}

	return refreshPromise;
}
