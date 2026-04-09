import { TestBed } from '@angular/core/testing';

import { InventoryStoreService } from '../../services/inventory-store.service';
import { InventoryEntry } from '../../models/inventory-entry.model';

describe('InventoryStoreService', () => {
  let service: InventoryStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventoryStoreService);
  });

  it('clones added input entries', () => {
    const rows: InventoryEntry[] = [
      {
        date: '2026-04-10',
        farmerId: 'F1',
        farmerName: 'Farmer 1',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 10,
        pricePerKg: 20
      }
    ];

    service.addEntries(rows);
    rows[0].quantityKg = 999;

    expect(service.snapshot()[0].quantityKg).toBe(10);
  });

  it('aggregates by farmer with date and maxDate filters', () => {
    service.addEntries([
      {
        date: '2026-04-09',
        farmerId: 'F1',
        farmerName: 'Farmer 1',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 8,
        pricePerKg: 20
      },
      {
        date: '2026-04-10',
        farmerId: 'F1',
        farmerName: 'Farmer 1',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 5,
        pricePerKg: 20
      },
      {
        date: '2026-04-10',
        farmerId: 'F2',
        farmerName: 'Farmer 2',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 7,
        pricePerKg: 21
      },
      {
        date: '2026-04-10',
        farmerId: 'F3',
        farmerName: 'Farmer 3',
        productId: 'P2',
        productName: 'Potato',
        quantityKg: 9,
        pricePerKg: 12
      }
    ]);

    const byDate = service.aggregatedByFarmer('P1', '2026-04-10');
    expect(byDate).toHaveLength(2);
    expect(byDate.find((r) => r.farmerId === 'F1')?.quantityKg).toBe(5);

    const byMaxDate = service.aggregatedByFarmer('P1', undefined, '2026-04-09');
    expect(byMaxDate).toHaveLength(1);
    expect(byMaxDate[0].farmerId).toBe('F1');
    expect(byMaxDate[0].quantityKg).toBe(8);
  });

  it('deducts from oldest eligible rows and removes depleted rows', () => {
    service.addEntries([
      {
        date: '2026-04-08',
        farmerId: 'F1',
        farmerName: 'Farmer 1',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 3,
        pricePerKg: 20
      },
      {
        date: '2026-04-09',
        farmerId: 'F1',
        farmerName: 'Farmer 1',
        productId: 'P1',
        productName: 'Tomato',
        quantityKg: 4,
        pricePerKg: 20
      }
    ]);

    service.deduct('P1', 'F1', 5, undefined, '2026-04-10');

    const snap = service.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].date).toBe('2026-04-09');
    expect(snap[0].quantityKg).toBe(2);
  });
});
