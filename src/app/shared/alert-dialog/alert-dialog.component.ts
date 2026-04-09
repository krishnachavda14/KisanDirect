import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="isOpen" (click)="onBackdropClick()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <h2 class="dialog-title">{{ title }}</h2>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn btn-confirm" (click)="onClose()">OK</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-content {
      background: linear-gradient(135deg, #f6fcf8, #fbfefc);
      border: 1px solid #c8ddd0;
      border-radius: 16px;
      padding: 28px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(37, 102, 68, 0.2);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dialog-title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #2d4f3f;
      text-align: center;
    }

    .dialog-message {
      margin: 0 0 20px;
      font-size: 14px;
      color: #5a6f68;
      text-align: center;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
    }

    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }

    .btn-confirm {
      background: linear-gradient(135deg, #285a3b, #1f4830);
      color: #ffffff;
    }

    .btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(37, 102, 68, 0.2);
    }
  `]
})
export class AlertDialogComponent {
  @Input() title = 'Success';
  @Input() message = 'Operation completed successfully.';

  isOpen = false;
  private resolveCallback: (() => void) | null = null;

  open(title: string, message: string): Promise<void> {
    this.title = title;
    this.message = message;
    this.isOpen = true;

    return new Promise((resolve) => {
      this.resolveCallback = resolve;
    });
  }

  onClose(): void {
    this.isOpen = false;
    if (this.resolveCallback) {
      this.resolveCallback();
      this.resolveCallback = null;
    }
  }

  onBackdropClick(): void {
    this.onClose();
  }
}
