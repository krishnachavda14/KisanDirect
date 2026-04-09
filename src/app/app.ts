import { AfterViewInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog.component';
import { AlertDialogComponent } from './shared/alert-dialog/alert-dialog.component';
import { ConfirmationDialogService } from './shared/confirmation-dialog/confirmation-dialog.service';
import { AlertDialogService } from './shared/alert-dialog/alert-dialog.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmationDialogComponent, AlertDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  @ViewChild(ConfirmationDialogComponent) private confirmationDialog?: ConfirmationDialogComponent;

  constructor(
    private readonly vcr: ViewContainerRef,
    private readonly confirmationDialogService: ConfirmationDialogService,
    private readonly alertDialogService: AlertDialogService
  ) {}

  ngAfterViewInit(): void {
    if (this.confirmationDialog) {
      this.confirmationDialogService.setDialogInstance(this.confirmationDialog);
    }
    this.confirmationDialogService.setViewContainerRef(this.vcr);
    this.alertDialogService.setViewContainerRef(this.vcr);
  }
}
