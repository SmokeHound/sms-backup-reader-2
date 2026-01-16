import { CsvExportService } from './csv-export.service';

describe('CsvExportService (media extraction)', () => {
	it('extractInlineBase64MediaFromHtml should replace data URLs and return files', () => {
		const svc = new CsvExportService();
		const html =
			'<div>Hello</div>' +
			'<img src="data:image/jpeg;base64,QUJD" />' +
			'<div>World</div>';

		const res = svc.extractInlineBase64MediaFromHtml(html, {
			conversationId: '+15551234567',
			messageIndex: 0,
			timestampMs: 1700000000000,
			baseDir: 'media'
		});

		expect(res.files.length).toBe(1);
		expect(res.files[0].mime).toBe('image/jpeg');
		expect(res.files[0].path).toContain('media/');
		expect(res.files[0].path).toContain('.jpg');
		expect(res.files[0].bytes.length).toBeGreaterThan(0);
		expect(res.html).toContain(`src="${res.files[0].path}"`);
		// no remaining data URLs
		expect(res.html).not.toContain('data:image/jpeg;base64');
	});
});
