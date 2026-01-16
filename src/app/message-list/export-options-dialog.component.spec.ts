import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ExportOptionsDialogComponent, ExportOptions } from './export-options-dialog.component';

describe('ExportOptionsDialogComponent', () => {
	let component: ExportOptionsDialogComponent;
	let fixture: ComponentFixture<ExportOptionsDialogComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CommonModule, FormsModule],
			declarations: [ExportOptionsDialogComponent],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		})
		.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ExportOptionsDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should default to conversation scope', () => {
		expect(component.scope).toBe('conversation');
	});

	it('should have all fields selected by default', () => {
		expect(component.fields.conversationId).toBe(true);
		expect(component.fields.contactName).toBe(true);
		expect(component.fields.direction).toBe(true);
		expect(component.fields.type).toBe(true);
		expect(component.fields.timestampMs).toBe(true);
		expect(component.fields.dateIso).toBe(true);
		expect(component.fields.bodyText).toBe(true);
		expect(component.fields.bodyHtml).toBe(true);
	});

	it('should default to not exporting MMS media as files', () => {
		expect(component.mmsMediaAsFiles).toBe(false);
	});

	it('should select all fields when selectAllFields is called', () => {
		component.fields.bodyText = false;
		component.fields.bodyHtml = false;
		component.selectAllFields();
		expect(component.fields.bodyText).toBe(true);
		expect(component.fields.bodyHtml).toBe(true);
	});

	it('should deselect all fields when deselectAllFields is called', () => {
		component.deselectAllFields();
		expect(component.fields.conversationId).toBe(false);
		expect(component.fields.contactName).toBe(false);
		expect(component.fields.direction).toBe(false);
		expect(component.fields.type).toBe(false);
		expect(component.fields.timestampMs).toBe(false);
		expect(component.fields.dateIso).toBe(false);
		expect(component.fields.bodyText).toBe(false);
		expect(component.fields.bodyHtml).toBe(false);
	});

	it('should emit onCancel when cancel is called', () => {
		let emitted = false;
		component.onCancel.subscribe(() => {
			emitted = true;
		});
		component.cancel();
		expect(emitted).toBe(true);
	});

	it('should emit onExport with correct options when export is called', () => {
		component.scope = 'all';
		component.fields.bodyHtml = false;
		component.mmsMediaAsFiles = true;
		
		let exportedOptions: ExportOptions | null = null;
		component.onExport.subscribe((options) => {
			exportedOptions = options;
		});
		
		component.export();
		
		expect(exportedOptions).not.toBeNull();
		expect(exportedOptions!.scope).toBe('all');
		// When media-as-files is enabled, bodyHtml is forced on.
		expect(exportedOptions!.mmsMediaAsFiles).toBe(true);
		expect(exportedOptions!.fields.bodyHtml).toBe(true);
		expect(exportedOptions!.fields.bodyText).toBe(true);
	});
});
