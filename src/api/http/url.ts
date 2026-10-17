import { env } from '../../shared/lib/env';

type QueryScalar = string | number | boolean;

/**
 * Array dikirim sebagai parameter berulang (`item=a&item=b`) — bentuk yang
 * dibaca FastAPI untuk parameter list. `String(array)` akan menjadi `a,b`.
 */
export type QueryValue = QueryScalar | readonly QueryScalar[] | null | undefined;

function appendQuery(url: string, query?: Record<string, QueryValue>): string {
	if (!query) return url;

	const searchParams = new URLSearchParams();

	Object.entries(query).forEach(([key, value]) => {
		if (value === undefined || value === null) return;
		if (Array.isArray(value)) {
			value.forEach((item: QueryScalar) => searchParams.append(key, String(item)));
			return;
		}
		searchParams.set(key, String(value));
	});

	const queryString = searchParams.toString();
	if (!queryString) return url;

	return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

export function buildApiUrl(path: string, query?: Record<string, QueryValue>): string {
	if (/^https?:\/\//i.test(path)) {
		return appendQuery(path, query);
	}

	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const baseUrl = env.apiBaseUrl === '/' ? '' : env.apiBaseUrl;
	return appendQuery(`${baseUrl}${normalizedPath}`, query);
}
