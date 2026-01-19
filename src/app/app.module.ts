import { BrowserModule } from '@angular/platform-browser';
import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { ContactListComponent } from './contact-list/contact-list.component';
import { MessageListComponent } from './message-list/message-list.component';
import { ExportOptionsDialogComponent } from './message-list/export-options-dialog.component';

import { SmsStoreService }  from './sms-store.service';
import { SmsLoaderService }  from './sms-loader.service';
import { VcfLoaderService }  from './vcf-loader.service';
import { VcfStoreService }  from './vcf-store.service';
import { SmsDbService } from './sms-db.service';
import { CountrySelectComponent } from './country-select/country-select.component';
import { LazyInnerHtmlDirective } from './directives/lazy-inner-html.directive';
import { MessageTypePipe } from './message-type.pipe';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import { VcfLoaderComponent } from './vcf-loader/vcf-loader.component';
import {ContactSearchPipe} from './components/pipes/contact-search-pipe';
const appRoutes: Routes = [
{ path: 'main', component: MainComponent },
{ path: 'settings', component: SettingsComponent },
{ path: '',
redirectTo: '/main',
pathMatch: 'full'
}];

@NgModule({
    declarations: [
    AppComponent,
    SmsLoaderComponent,
    ContactListComponent,
    MessageListComponent,
    ExportOptionsDialogComponent,
    CountrySelectComponent,
    MessageTypePipe,
    MainComponent,
    SettingsComponent,
    VcfLoaderComponent,
    ContactSearchPipe
    ],
    imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(appRoutes),
    ScrollingModule,
    LazyInnerHtmlDirective
    ],
    providers: [
        provideBrowserGlobalErrorListeners(),
        SmsStoreService,
        SmsDbService,
        SmsLoaderService,
        VcfLoaderService,
        VcfStoreService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
