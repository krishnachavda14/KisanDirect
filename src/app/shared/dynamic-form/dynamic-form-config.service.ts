import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

import { DynamicFormConfig } from './dynamic-form.types';

@Injectable({ providedIn: 'root' })
export class DynamicFormConfigService {
  private readonly configSubject = new BehaviorSubject<DynamicFormConfig | null>(null);
  readonly config$ = this.configSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  setConfig(config: DynamicFormConfig): void {
    this.configSubject.next(config);
  }

  /** Call when leaving a page that owns the form so the next page does not briefly show the old config. */
  clearConfig(): void {
    this.configSubject.next(null);
  }

  loadConfig(url: string): void {
    this.http.get<DynamicFormConfig>(url).subscribe((config) => {
      this.setConfig(config);
    });
  }
}
