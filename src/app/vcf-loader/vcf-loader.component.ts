import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { VcfLoaderService } from '../vcf-loader.service';
import { LoaderStatusUpdate } from '../loader-status';


@Component({
    selector: 'vcf-loader',
    templateUrl: './vcf-loader.component.html',
    styleUrls: ['./vcf-loader.component.css'],
    standalone: false
})
export class VcfLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    @Output() statusChanged = new EventEmitter<LoaderStatusUpdate>();
    sampleText: string = 'not loaded';
    loaded: boolean = false;
	status: 'idle' | 'busy' | 'ok' | 'error' = 'idle';

    constructor(
        private VcfLoaderService: VcfLoaderService,
        ) { }

    ngOnInit() {
		this.status = 'idle';
		this.emitStatus();
    }

    fileChange(fileEvent: any): void {
        this.sampleText = 'Loading...';
		this.status = 'busy';
        this.loaded = false;
		this.emitStatus();

        var file: File;
        if (fileEvent.target.files && fileEvent.target.files.length >= 1) {
            file = fileEvent.target.files[0];
            this.VcfLoaderService
                .loadVCFFile(file)
                .then(() => {
                    this.sampleText = 'Loaded!';
					this.status = 'ok';
					this.emitStatus();
                    this.onLoaded.emit(true);
                    this.loaded = true;
                })
                .catch((err) => {
                    this.sampleText = 'Failed to load';
					this.status = 'error';
					this.emitStatus();
                    this.onLoaded.emit(false);
                    this.loaded = false;
                    console.error('Failed to load VCF file', err);
                })
                .finally(() => {
                    if (fileEvent?.target) {
                        fileEvent.target.value = '';
                    }
                });
        }
    }

    private emitStatus(): void {
        this.statusChanged.emit({
            source: 'vcf',
            status: this.status,
            text: this.sampleText,
            updatedAt: Date.now()
        });
    }
}

