export type DashboardSkeletonVariant =
	'overview' | 'telemetering' | 'trends' | 'forecasting' | 'table' | 'upload' | 'form' | 'default';

export function getDashboardSkeletonVariant(pathname: string): DashboardSkeletonVariant {
	// Diperiksa sebelum '/telemetering' karena alamat lama `/telemetering/upload`
	// masih dialihkan ke sini dan bentuk kerangkanya dropzone, bukan panel parameter.
	if (pathname.includes('/upload') || pathname.includes('/input-ghw')) return 'upload';
	if (pathname.includes('/telemetering/rekap')) return 'default';
	if (pathname.includes('/telemetering')) return 'telemetering';
	if (pathname.includes('/trends')) return 'trends';
	if (pathname.includes('/forecasting')) return 'forecasting';
	if (pathname.includes('/account')) return 'form';
	if (
		pathname.includes('/laporan') ||
		pathname.includes('/catalog') ||
		pathname.includes('/user-management')
	)
		return 'table';
	if (pathname.includes('/overview')) return 'overview';
	return 'default';
}
