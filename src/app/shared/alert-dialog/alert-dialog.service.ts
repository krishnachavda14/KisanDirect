import { Injectable, ViewContainerRef } from '@angular/core';
import { AlertDialogComponent } from './alert-dialog.component';

@Injectable({ providedIn: 'root' })
export class AlertDialogService {
  private viewContainerRef: ViewContainerRef | null = null;
  private dialogInstance: AlertDialogComponent | null = null;

  setViewContainerRef(vcr: ViewContainerRef): void {
    this.viewContainerRef = vcr;
  }

  async alert(title: string, message: string): Promise<void> {
    if (!this.viewContainerRef) {
      console.warn('Dialog ViewContainerRef not set. Falling back to alert()');
      window.alert(`${title}\n\n${message}`);
      return;
    }

    if (!this.dialogInstance) {
      const componentRef = this.viewContainerRef.createComponent(AlertDialogComponent);
      this.dialogInstance = componentRef.instance;
    }

    return this.dialogInstance.open(title, message);
  }
}
