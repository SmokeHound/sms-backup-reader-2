import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ExportOptions {
	scope: 'conversation' | 'all';
	// When enabled, export creates a .zip with CSV + extracted media files.
	mmsMediaAsFiles: boolean;
	fields: {
		conversationId: boolean;
		contactName: boolean;
		direction: boolean;
		type: boolean;
		timestampMs: boolean;
		dateIso: boolean;
		bodyText: boolean;
		bodyHtml: boolean;
	};
}

@Component({
	selector: 'export-options-dialog',
	templateUrl: './export-options-dialog.component.html',
	styleUrls: ['./export-options-dialog.component.css'],
	standalone: false
})
export class ExportOptionsDialogComponent {
	@Input() isOpen = false;
	@Output() onCancel = new EventEmitter<void>();
	@Output() onExport = new EventEmitter<ExportOptions>();

	// Export scope
	scope: 'conversation' | 'all' = 'conversation';

	// Media export
	mmsMediaAsFiles = false;

	// Field selections - all enabled by default
	fields = {
		conversationId: true,
		contactName: true,
		direction: true,
		type: true,
		timestampMs: true,
		dateIso: true,
		bodyText: true,
		bodyHtml: true
	};

	cancel(): void {
		this.onCancel.emit();
	}

	export(): void {
		if (this.mmsMediaAsFiles) {
			// To make the exported media usable, we need HTML with file references.
			this.fields.bodyHtml = true;
		}

		this.onExport.emit({
			scope: this.scope,
			mmsMediaAsFiles: this.mmsMediaAsFiles,
			fields: { ...this.fields }
		});
	}

	selectAllFields(): void {
		Object.keys(this.fields).forEach(key => {
			this.fields[key as keyof typeof this.fields] = true;
		});
	}

	deselectAllFields(): void {
		Object.keys(this.fields).forEach(key => {
			this.fields[key as keyof typeof this.fields] = false;
		});
	}
}
