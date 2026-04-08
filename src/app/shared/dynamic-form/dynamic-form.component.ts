import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map, of, shareReplay } from 'rxjs';

import { DynamicFormConfigService } from './dynamic-form-config.service';
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

  config: DynamicFormConfig | null = null;
  form: FormGroup = new FormGroup({});
  private readonly optionsCache = new Map<string, Observable<SelectOption[]>>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly configService: DynamicFormConfigService,
    private readonly http: HttpClient,
    private readonly destroyRef: DestroyRef
  ) {
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

  removeArrayItem(arrayField: ArrayFieldConfig, index: number): void {
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
    }

    return fns;
  }
}

