/**
 * Padanan `NavLink` milik react-router: aktif bila path sama persis, atau —
 * ketika `end` tidak disetel — bila path saat ini berada di bawah tautan itu.
 *
 * Query string diabaikan; tautan sidebar tidak pernah membawa parameter.
 */
export function isNavActive(currentPath: string, href: string, end = false): boolean {
	const target = href.split('?')[0];
	if (currentPath === target) return true;
	if (end) return false;
	return currentPath.startsWith(`${target}/`);
}
