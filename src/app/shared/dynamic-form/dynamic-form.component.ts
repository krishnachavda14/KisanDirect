import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, Output, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map, of, shareReplay } from 'rxjs';

import { DynamicFormConfigService } from './dynamic-form-config.service';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';
import { ArrayFieldConfig, BaseFieldConfig, DynamicFormConfig, SelectOptionsConfig, ValidatorsConfig } from './dynamic-form.types';

type SelectOption = { value: string; label: string };

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.css'
})
export class DynamicFormComponent {
  @Output() formSubmitted = new EventEmitter<{ value: any; isValid: boolean }>();
  @Input() arrayStartIndex = 1;
  @Input() placeOrderBusy = false;
  @Input() removeConfirmMessage = 'Are you sure you want to remove this item?';

  config: DynamicFormConfig | null = null;
  form: FormGroup = new FormGroup({});
  private readonly optionsCache = new Map<string, Observable<SelectOption[]>>();
  private readonly todayMinDate = this.currentDateYmd();

  constructor(
    private readonly fb: FormBuilder,
    private readonly configService: DynamicFormConfigService,
    private readonly http: HttpClient,
    private readonly destroyRef: DestroyRef,
    private readonly vcr: ViewContainerRef,
    private readonly confirmationDialogService: ConfirmationDialogService
  ) {
    this.confirmationDialogService.setViewContainerRef(vcr);
    this.configService.config$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((config) => {
        this.config = config;
        this.form = config ? this.buildForm(config) : this.fb.group({});
      });
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  getArray(fieldKey: string): FormArray {
    return this.form.get(fieldKey) as FormArray;
  }

  addArrayItem(arrayField: ArrayFieldConfig): void {
    const array = this.getArray(arrayField.key);
    array.push(this.buildArrayItemGroup(arrayField));
  }

  async removeArrayItem(arrayField: ArrayFieldConfig, index: number): Promise<void> {
    const shouldRemove = await this.confirmationDialogService.confirm(this.removeConfirmMessage);
    if (!shouldRemove) return;

    const array = this.getArray(arrayField.key);
    array.removeAt(index);
  }

  selectOptions$(options?: SelectOptionsConfig) {
    if (!options) return of<SelectOption[]>([]);

    const cacheKey = `${options.source}|${options.valueKey}|${options.labelKey}`;
    const existing = this.optionsCache.get(cacheKey);
    if (existing) return existing;

    const request$ = this.http.get<any[]>(options.source).pipe(
      map((rows) =>
        rows.map((row) => ({
          value: String(row[options.valueKey]),
          label: String(row[options.labelKey])
        }))
      ),
      shareReplay(1)
    );

    this.optionsCache.set(cacheKey, request$);
    return request$;
  }

  fieldError(field: BaseFieldConfig, group?: FormGroup): string | null {
    const control = (group ?? this.form).get(field.key) as FormControl | null;
    if (!control || !control.touched || !control.errors) return null;

    const validators = field.validators ?? [];

    if (control.errors['required']) {
      return validators.find((v) => v.name === 'required')?.message ?? 'This field is required.';
    }

    if (control.errors['min']) {
      return validators.find((v) => v.name === 'min')?.message ?? 'Value is too small.';
    }

    if (control.errors['max']) {
      return validators.find((v) => v.name === 'max')?.message ?? 'Value is too large.';
    }

    return 'Invalid value.';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.formSubmitted.emit({
      value: this.form.getRawValue(),
      isValid: this.form.valid
    });
  }

  resetForm(defaultValues: Record<string, unknown> = {}): void {
    if (!this.config) {
      this.form = this.fb.group({});
      return;
    }

    this.form = this.buildForm(this.config);
    this.form.patchValue(defaultValues);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  inputMin(type: string): string | null {
    return type === 'date' ? this.todayMinDate : null;
  }

  private buildForm(config: DynamicFormConfig): FormGroup {
    const group: Record<string, any> = {};

    for (const field of config.fields) {
      if (field.type === 'array') {
        const array = new FormArray<FormGroup>([]);

        const minItems = field.minItems ?? 0;
        for (let i = 0; i < minItems; i++) {
          array.push(this.buildArrayItemGroup(field));
        }

        group[field.key] = array;
      } else {
        group[field.key] = this.fb.control('', this.buildValidators(field.validators));
      }
    }

    return this.fb.group(group);
  }

  private buildArrayItemGroup(arrayField: ArrayFieldConfig): FormGroup {
    const itemGroup: Record<string, any> = {};

    for (const field of arrayField.fields) {
      itemGroup[field.key] = this.fb.control('', this.buildValidators(field.validators));
    }

    return this.fb.group(itemGroup);
  }

  private buildValidators(validators?: ValidatorsConfig[]): ValidatorFn[] {
    if (!validators || validators.length === 0) return [];

    const fns: ValidatorFn[] = [];

    for (const v of validators) {
      if (v.name === 'required') fns.push(Validators.required);
      if (v.name === 'min' && typeof v.value === 'number') fns.push(Validators.min(v.value));
      if (v.name === 'max' && typeof v.value === 'number') fns.push(Validators.max(v.value));
    }

    return fns;
  }

  private currentDateYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  hasArrayItems(): boolean {
    if (!this.config) return false;

    // Check if there are any array fields
    const arrayFields = this.config.fields.filter((f) => f.type === 'array');
    if (arrayFields.length === 0) return true; // No arrays, show submit

    // Check if at least one array has items
    for (const field of arrayFields) {
      const array = this.form.get(field.key) as FormArray;
      if (array && array.length > 0) {
        return true;
      }
    }

    return false;
  }

  isFieldRequired(field: any): boolean {
    return !!(field?.validators && field.validators.some((v: ValidatorsConfig) => v.name === 'required'));
  }
}

