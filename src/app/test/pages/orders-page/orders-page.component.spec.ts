import { BehaviorSubject, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

import { OrdersPageComponent } from '../../../pages/orders-page/orders-page.component';
import { DynamicFormConfigService } from '../../../shared/dynamic-form/dynamic-form-config.service';
import { OrdersService } from '../../../services/orders.service';
import { OrderFulfillmentService } from '../../../services/order-fulfillment.service';
import { Order } from '../../../models/order.model';

describe('OrdersPageComponent', () => {
  const orders$ = new BehaviorSubject<Order[]>([]);

  const configServiceMock = {
    setConfig: vi.fn(),
    clearConfig: vi.fn()
  };

  const ordersServiceMock = {
    orders$,
    filterByStatus: vi.fn(() => []),
    addOrder: vi.fn(),
    getById: vi.fn()
  };

  const fulfillmentServiceMock = {
    assignFarmersToOrder: vi.fn(),
    fulfillOrder: vi.fn()
  };

  const httpMock = {
    get: vi.fn((url: string) => {
      if (url.includes('kiranas')) return of([{ id: 'K1', shopName: 'Shop 1' }]);
      if (url.includes('products')) return of([{ id: 'P1', name: 'Tomato' }]);
      return of([]);
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orders$.next([]);

    TestBed.configureTestingModule({
      imports: [OrdersPageComponent],
      providers: [
        { provide: DynamicFormConfigService, useValue: configServiceMock },
        { provide: OrdersService, useValue: ordersServiceMock },
        { provide: OrderFulfillmentService, useValue: fulfillmentServiceMock },
        { provide: HttpClient, useValue: httpMock }
      ]
    });
  });

  it('shows validation message when order submit event is invalid', async () => {
    const fixture = TestBed.createComponent(OrdersPageComponent);
    const component = fixture.componentInstance;

    await component.onOrderSubmit({ isValid: false, value: {} });

    expect(component.placeOrderMessage).toBe('Please fix validation errors, then submit again.');
  });

  it('creates order on valid submit and switches to pending filter', async () => {
    const fixture = TestBed.createComponent(OrdersPageComponent);
    const component = fixture.componentInstance;

    await component.onOrderSubmit({
      isValid: true,
      value: {
        kiranaId: 'K1',
        deliveryDate: '2026-04-10',
        notes: 'n',
        lineItems: [{ productId: 'P1', quantityKg: 5 }]
      }
    });

    expect(ordersServiceMock.addOrder).toHaveBeenCalledOnce();
    expect(component.activeFilter).toBe('pending');
    expect(component.showPlaceOrderForm).toBe(false);
  });

  it('handles order submit master-data failure', async () => {
    httpMock.get.mockImplementation(() => throwError(() => new Error('network')));

    const fixture = TestBed.createComponent(OrdersPageComponent);
    const component = fixture.componentInstance;

    await component.onOrderSubmit({
      isValid: true,
      value: {
        kiranaId: 'K1',
        deliveryDate: '2026-04-10',
        notes: '',
        lineItems: [{ productId: 'P1', quantityKg: 5 }]
      }
    });

    expect(component.placeOrderMessage).toBe('Could not load master data. Try again.');
  });

  it('moves to assigned filter after successful assignment', async () => {
    const pendingOrder = {
      id: 'O1',
      status: 'pending'
    } as Order;

    const assignedOrder = {
      id: 'O1',
      status: 'assigned'
    } as Order;

    const fixture = TestBed.createComponent(OrdersPageComponent);
    const component = fixture.componentInstance;
    component.selectedOrder = pendingOrder;

    fulfillmentServiceMock.assignFarmersToOrder.mockResolvedValue({});
    ordersServiceMock.getById.mockReturnValue(assignedOrder);

    await component.assignFarmers();

    expect(component.activeFilter).toBe('assigned');
  });

  it('moves to fulfilled filter after successful fulfillment', async () => {
    const assignedOrder = {
      id: 'O2',
      status: 'assigned'
    } as Order;

    const fulfilledOrder = {
      id: 'O2',
      status: 'fulfilled'
    } as Order;

    const fixture = TestBed.createComponent(OrdersPageComponent);
    const component = fixture.componentInstance;
    component.selectedOrder = assignedOrder;

    fulfillmentServiceMock.fulfillOrder.mockResolvedValue({});
    ordersServiceMock.getById.mockReturnValue(fulfilledOrder);

    await component.fulfillSelected();

    expect(component.activeFilter).toBe('fulfilled');
  });
});
