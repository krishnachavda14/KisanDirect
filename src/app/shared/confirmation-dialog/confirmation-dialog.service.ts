import { Injectable, ViewContainerRef } from '@angular/core';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  private viewContainerRef: ViewContainerRef | null = null;
  private dialogInstance: ConfirmationDialogComponent | null = null;

  setDialogInstance(instance: ConfirmationDialogComponent): void {
    this.dialogInstance = instance;
  }

  setViewContainerRef(vcr: ViewContainerRef): void {
    this.viewContainerRef = vcr;
  }

  async confirm(message: string): Promise<boolean> {
    if (!this.viewContainerRef) {
      console.warn('Dialog ViewContainerRef not set. Falling back to confirm()');
      return window.confirm(message);
    }

    if (!this.dialogInstance) {
      const componentRef = this.viewContainerRef.createComponent(ConfirmationDialogComponent);
      this.dialogInstance = componentRef.instance;
    }

    return this.dialogInstance.open(message);
  }
}

