export type LoadStatus = 'idle' | 'busy' | 'ok' | 'error';

export interface LoaderStatusUpdate {
	source: 'sms' | 'vcf';
	status: LoadStatus;
	text: string;
	updatedAt: number;
	// SMS-only (optional)
	progressPercent?: number;
	bytesRead?: number;
	totalBytes?: number;
	parsedCount?: number;
}
