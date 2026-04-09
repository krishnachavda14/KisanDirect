import { BehaviorSubject, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

import { InventoryPageComponent } from '../../../pages/inventory-page/inventory-page.component';
import { DynamicFormConfigService } from '../../../shared/dynamic-form/dynamic-form-config.service';
import { InventoryStoreService } from '../../../services/inventory-store.service';
import { AlertDialogService } from '../../../shared/alert-dialog/alert-dialog.service';

describe('InventoryPageComponent', () => {
  const entries$ = new BehaviorSubject<any[]>([]);
  const configSubject = new BehaviorSubject<any>(null);

  const configServiceMock = {
    config$: configSubject.asObservable(),
    setConfig: vi.fn((config: any) => configSubject.next(config)),
    clearConfig: vi.fn(() => configSubject.next(null))
  };

  const inventoryStoreMock = {
    entries$,
    snapshot: vi.fn(() => []),
    addEntries: vi.fn()
  };

  const alertDialogMock = {
    alert: vi.fn().mockResolvedValue(undefined)
  };

  const httpMock = {
    get: vi.fn((url: string) => {
      if (url.includes('farmers')) {
        return of([{ id: 'F1', name: 'Farmer 1' }]);
      }
      if (url.includes('products')) {
        return of([{ id: 'P1', name: 'Tomato' }]);
      }
      return of([]);
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    entries$.next([]);
    configSubject.next(null);

    TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [
        { provide: DynamicFormConfigService, useValue: configServiceMock },
        { provide: InventoryStoreService, useValue: inventoryStoreMock },
        { provide: AlertDialogService, useValue: alertDialogMock },
        { provide: HttpClient, useValue: httpMock }
      ]
    });
  });

  it('does not submit when form event is invalid', async () => {
    const fixture = TestBed.createComponent(InventoryPageComponent);
    const component = fixture.componentInstance;

    await component.onInventorySubmit({
      isValid: false,
      value: { date: '2026-04-10', entries: [] }
    });

    expect(inventoryStoreMock.addEntries).not.toHaveBeenCalled();
  });

  it('submits valid entries and shows success alert', async () => {
    const fixture = TestBed.createComponent(InventoryPageComponent);
    const component = fixture.componentInstance as any;

    component.dynamicForm = { resetForm: vi.fn() };

    await component.onInventorySubmit({
      isValid: true,
      value: {
        date: '2026-04-10',
        entries: [
          {
            farmerId: 'F1',
            productId: 'P1',
            quantityKg: 10,
            pricePerKg: 20
          }
        ]
      }
    });

    expect(inventoryStoreMock.addEntries).toHaveBeenCalledOnce();
    expect(alertDialogMock.alert).toHaveBeenCalledWith('Success', 'Farmer successfully added 1 item.');
    expect(component.nextEntryNumber).toBe(2);
    expect(component.dynamicForm.resetForm).toHaveBeenCalled();
  });
});
