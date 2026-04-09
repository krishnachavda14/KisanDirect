import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { DynamicFormComponent } from '../../../shared/dynamic-form/dynamic-form.component';
import { DynamicFormConfigService } from '../../../shared/dynamic-form/dynamic-form-config.service';
import { DynamicFormConfig } from '../../../shared/dynamic-form/dynamic-form.types';
import { ConfirmationDialogService } from '../../../shared/confirmation-dialog/confirmation-dialog.service';

describe('DynamicFormComponent', () => {
  const confirmationServiceMock = {
    confirm: vi.fn()
  };

  const config: DynamicFormConfig = {
    formId: 'testForm',
    title: 'Test Form',
    fields: [
      {
        key: 'date',
        type: 'date',
        label: 'Date',
        validators: [{ name: 'required', message: 'Date required.' }]
      },
      {
        key: 'entries',
        type: 'array',
        label: 'Entries',
        minItems: 0,
        fields: [
          {
            key: 'name',
            type: 'text',
            label: 'Name',
            validators: [{ name: 'required', message: 'Name required.' }]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [
        provideHttpClient(),
        DynamicFormConfigService,
        { provide: ConfirmationDialogService, useValue: confirmationServiceMock }
      ]
    });
  });

  it('builds form from config', () => {
    const fixture = TestBed.createComponent(DynamicFormComponent);
    const component = fixture.componentInstance;
    const configService = TestBed.inject(DynamicFormConfigService);

    configService.setConfig(config);
    fixture.detectChanges();

    expect(component.form.get('date')).toBeTruthy();
    expect(component.getArray('entries').length).toBe(0);
  });

  it('adds and removes array item after confirmation', async () => {
    confirmationServiceMock.confirm.mockResolvedValue(true);

    const fixture = TestBed.createComponent(DynamicFormComponent);
    const component = fixture.componentInstance;
    const configService = TestBed.inject(DynamicFormConfigService);

    configService.setConfig(config);
    fixture.detectChanges();

    const arrayField = config.fields[1];
    if (arrayField.type !== 'array') throw new Error('Expected array field');

    component.addArrayItem(arrayField);
    expect(component.getArray('entries').length).toBe(1);

    await component.removeArrayItem(arrayField, 0);
    expect(component.getArray('entries').length).toBe(0);
  });

  it('keeps array item when removal confirmation is cancelled', async () => {
    confirmationServiceMock.confirm.mockResolvedValue(false);

    const fixture = TestBed.createComponent(DynamicFormComponent);
    const component = fixture.componentInstance;
    const configService = TestBed.inject(DynamicFormConfigService);

    configService.setConfig(config);
    fixture.detectChanges();

    const arrayField = config.fields[1];
    if (arrayField.type !== 'array') throw new Error('Expected array field');

    component.addArrayItem(arrayField);
    await component.removeArrayItem(arrayField, 0);

    expect(component.getArray('entries').length).toBe(1);
  });

  it('marks past date as invalid', () => {
    const fixture = TestBed.createComponent(DynamicFormComponent);
    const component = fixture.componentInstance;
    const configService = TestBed.inject(DynamicFormConfigService);

    configService.setConfig(config);
    fixture.detectChanges();

    const control = component.form.get('date');
    control?.setValue('1999-01-01');

    expect(control?.errors?.['dateMin']).toBe(true);
  });

  it('select helpers update value and close menu', () => {
    const fixture = TestBed.createComponent(DynamicFormComponent);
    const component = fixture.componentInstance;
    const configService = TestBed.inject(DynamicFormConfigService);

    configService.setConfig(config);
    fixture.detectChanges();

    const group = component.asFormGroup(component.form);
    component.openSelectKey = 'date';
    component.chooseSelectOption(group, 'date', '2026-04-10');

    expect(component.form.get('date')?.value).toBe('2026-04-10');
    expect(component.openSelectKey).toBeNull();
  });
});
