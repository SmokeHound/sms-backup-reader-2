import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { VcfLoaderService } from '../vcf-loader.service';


@Component({
    selector: 'vcf-loader',
    templateUrl: './vcf-loader.component.html',
    styleUrls: ['./vcf-loader.component.css'],
    standalone: false
})
export class VcfLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    sampleText: String = 'not loaded';
    loaded: boolean = false;

    constructor(
        private VcfLoaderService: VcfLoaderService,
        ) { }

    ngOnInit() {
    }

    fileChange(fileEvent: any): void {
        this.sampleText = 'Loading...';
        this.loaded = false;

        var file: File;
        if (fileEvent.target.files && fileEvent.target.files.length >= 1) {
            file = fileEvent.target.files[0];
            this.VcfLoaderService
                .loadVCFFile(file)
                .then(() => {
                    this.sampleText = 'Loaded!';
                    this.onLoaded.emit(true);
                    this.loaded = true;
                })
                .catch((err) => {
                    this.sampleText = 'Failed to load';
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
}

