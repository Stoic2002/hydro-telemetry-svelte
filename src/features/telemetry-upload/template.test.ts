import { describe, expect, it } from 'vitest';
import { formatTemplateMonth, telemetryTemplateFilename, telemetryTemplateQuery } from './template';

describe('telemetryTemplateQuery', () => {
	it('harian per jam memakai tanggal dan resolusi bawaan', () => {
		expect(telemetryTemplateQuery('day-hourly', '2026-10-15')).toEqual({
			periode: 'harian',
			tanggal: '2026-10-15'
		});
	});

	it('bulanan hanya membawa tahun dan bulan dari tanggal', () => {
		expect(telemetryTemplateQuery('month-hourly', '2026-10-15')).toEqual({
			periode: 'bulanan',
			tahun: 2026,
			bulan: 10,
			resolusi: undefined
		});
		expect(telemetryTemplateQuery('month-daily', '2026-02-03')).toEqual({
			periode: 'bulanan',
			tahun: 2026,
			bulan: 2,
			resolusi: 'hari'
		});
	});

	it('tanpa tanggal tidak menyusun query', () => {
		expect(telemetryTemplateQuery('day-hourly', '')).toBeNull();
	});
});

describe('nama berkas dan keterangan template', () => {
	it('memuat parameter, station, dan periode', () => {
		expect(
			telemetryTemplateFilename('plan_outflow_spillway', 'G1', 'day-hourly', '2026-10-15')
		).toBe('template-plan_outflow_spillway-G1-2026-10-15.xlsx');
		expect(telemetryTemplateFilename('target_tma', '', 'month-daily', '2026-10-15')).toBe(
			'template-target_tma-2026-10-per-hari.xlsx'
		);
	});

	it('menulis nama bulan', () => {
		expect(formatTemplateMonth('2026-10-15')).toBe('Oktober 2026');
	});
});
