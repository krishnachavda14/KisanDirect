import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrderFulfillmentService } from '../../services/order-fulfillment.service';
import { InventoryStoreService } from '../../services/inventory-store.service';
import { OrdersService } from '../../services/orders.service';

describe('OrderFulfillmentService', () => {
  let service: OrderFulfillmentService;
  let httpMock: HttpTestingController;

  const inventoryStoreMock = {
    aggregatedByFarmer: vi.fn(),
    deduct: vi.fn()
  };

  const ordersServiceMock = {
    getById: vi.fn(),
    applyAssignment: vi.fn(),
    applyFulfillment: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrderFulfillmentService,
        { provide: InventoryStoreService, useValue: inventoryStoreMock },
        { provide: OrdersService, useValue: ordersServiceMock }
      ]
    });

    service = TestBed.inject(OrderFulfillmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns error when order is not found during assignment', async () => {
    ordersServiceMock.getById.mockReturnValue(undefined);

    const result = await service.assignFarmersToOrder('missing');

    expect(result.error).toBe('Order not found.');
  });

  it('assigns farmers and applies assignment for pending order', async () => {
    ordersServiceMock.getById.mockReturnValue({
      id: 'O1',
      kiranaId: 'K1',
      deliveryDate: '2026-04-10',
      status: 'pending',
      lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 6 }]
    });

    inventoryStoreMock.aggregatedByFarmer.mockReturnValue([
      { farmerId: 'F2', farmerName: 'Farmer 2', quantityKg: 10 },
      { farmerId: 'F1', farmerName: 'Farmer 1', quantityKg: 2 }
    ]);

    const promise = service.assignFarmersToOrder('O1');

    const farmersReq = httpMock.expectOne('assets/data/farmers.json');
    farmersReq.flush([
      { id: 'F1', name: 'Farmer 1', location: 4 },
      { id: 'F2', name: 'Farmer 2', location: 9 }
    ]);

    const kiranaReq = httpMock.expectOne('assets/data/kiranas.json');
    kiranaReq.flush([{ id: 'K1', shopName: 'Shop', location: 5 }]);

    const result = await promise;

    expect(result.error).toBeUndefined();
    expect(ordersServiceMock.applyAssignment).toHaveBeenCalledOnce();
    const [orderId, snapshot] = ordersServiceMock.applyAssignment.mock.calls[0];
    expect(orderId).toBe('O1');
    expect(snapshot.detailLines[0].allocations.length).toBeGreaterThan(0);
  });

  it('auto-cancels assignment when no allocations are possible', async () => {
    ordersServiceMock.getById.mockReturnValue({
      id: 'O2',
      kiranaId: 'K1',
      deliveryDate: '2026-04-10',
      status: 'pending',
      lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 6 }]
    });

    inventoryStoreMock.aggregatedByFarmer.mockReturnValue([]);

    const promise = service.assignFarmersToOrder('O2');

    httpMock.expectOne('assets/data/farmers.json').flush([{ id: 'F1', name: 'Farmer 1', location: 1 }]);
    httpMock.expectOne('assets/data/kiranas.json').flush([{ id: 'K1', shopName: 'Shop', location: 5 }]);

    await promise;

    expect(ordersServiceMock.applyFulfillment).toHaveBeenCalledWith(
      'O2',
      'cancelled',
      expect.objectContaining({ detailLines: expect.any(Array) })
    );
  });

  it('fulfills assigned order and deducts allocations', async () => {
    ordersServiceMock.getById.mockReturnValue({
      id: 'O3',
      status: 'assigned',
      deliveryDate: '2026-04-10',
      assignment: {
        allocatedAt: new Date().toISOString(),
        detailLines: [
          {
            productId: 'P1',
            productName: 'Tomato',
            requestedKg: 10,
            shortfallKg: 2,
            allocations: [{ farmerId: 'F1', farmerName: 'Farmer 1', quantityKg: 8, distanceKm: 2, farmerLocationKm: 3 }]
          }
        ]
      }
    });

    const result = await service.fulfillOrder('O3');

    expect(result.error).toBeUndefined();
    expect(inventoryStoreMock.deduct).toHaveBeenCalledWith('P1', 'F1', 8, undefined, '2026-04-10');
    expect(ordersServiceMock.applyFulfillment).toHaveBeenCalledWith(
      'O3',
      'partially_fulfilled',
      expect.objectContaining({ detailLines: expect.any(Array) })
    );
  });

  it('returns error for fulfillment when order is not assigned', async () => {
    ordersServiceMock.getById.mockReturnValue({ id: 'O4', status: 'pending' });

    const result = await service.fulfillOrder('O4');

    expect(result.error).toBe('Only assigned orders can be fulfilled.');
  });
});
