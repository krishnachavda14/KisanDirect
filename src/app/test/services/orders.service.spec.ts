import { TestBed } from '@angular/core/testing';

import { OrdersService } from '../../services/orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrdersService);
  });

  it('seeds demo data', () => {
    const snapshot = service.snapshot();
    expect(snapshot.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.some((o) => o.id === 'O-demo-1')).toBe(true);
  });

  it('filters fulfilled_all as fulfilled and partially_fulfilled', () => {
    const created = service.addOrder({
      kiranaId: 'K9',
      kiranaName: 'Test Shop',
      deliveryDate: '2026-04-10',
      notes: '',
      lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 5 }]
    });

    service.applyFulfillment(created.id, 'partially_fulfilled', {
      computedAt: new Date().toISOString(),
      detailLines: [
        {
          productId: 'P1',
          productName: 'Tomato',
          requestedKg: 5,
          shortfallKg: 1,
          allocations: []
        }
      ]
    });

    const fulfilledAll = service.filterByStatus('fulfilled_all');
    expect(fulfilledAll.some((o) => o.status === 'fulfilled')).toBe(true);
    expect(fulfilledAll.some((o) => o.status === 'partially_fulfilled')).toBe(true);
  });

  it('adds order as pending and to the top of list', () => {
    const topBefore = service.snapshot()[0]?.id;

    const order = service.addOrder({
      kiranaId: 'K1',
      kiranaName: 'Kirana',
      deliveryDate: '2026-04-10',
      notes: 'note',
      lineItems: [{ productId: 'P2', productName: 'Onion', quantityKg: 10 }]
    });

    expect(order.status).toBe('pending');
    expect(service.snapshot()[0].id).toBe(order.id);
    expect(service.snapshot()[0].id).not.toBe(topBefore);
  });

  it('applies assignment and fulfillment updates', () => {
    const order = service.addOrder({
      kiranaId: 'K1',
      kiranaName: 'Kirana',
      deliveryDate: '2026-04-10',
      notes: '',
      lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 10 }]
    });

    service.applyAssignment(order.id, {
      allocatedAt: new Date().toISOString(),
      detailLines: [
        {
          productId: 'P1',
          productName: 'Tomato',
          requestedKg: 10,
          shortfallKg: 0,
          allocations: []
        }
      ]
    });

    expect(service.getById(order.id)?.status).toBe('assigned');

    service.applyFulfillment(order.id, 'cancelled', {
      computedAt: new Date().toISOString(),
      detailLines: []
    });

    expect(service.getById(order.id)?.status).toBe('cancelled');
    expect(service.getById(order.id)?.fulfillment).toBeTruthy();
  });
});
