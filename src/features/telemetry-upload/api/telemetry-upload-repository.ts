import type {
	DeleteTelemetryPointsInput,
	DownloadTelemetryTemplateInput,
	TelemetryDeleteResult,
	TelemetryUploadResult,
	UploadTelemetryExcelInput,
	UploadTelemetryPointsInput
} from '../model';

export interface TelemetryUploadRepository {
	uploadPoints(input: UploadTelemetryPointsInput): Promise<TelemetryUploadResult>;
	uploadExcel(input: UploadTelemetryExcelInput): Promise<TelemetryUploadResult>;
	deletePoints(input: DeleteTelemetryPointsInput): Promise<TelemetryDeleteResult>;
	downloadTemplate(input: DownloadTelemetryTemplateInput): Promise<Blob>;
}
