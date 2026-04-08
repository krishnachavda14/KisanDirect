import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin, timeout } from 'rxjs';

import { AllocationLine, LineFulfillmentDetail, OrderFulfillmentSnapshot } from '../models/order.model';
import { InventoryStoreService } from './inventory-store.service';
import { OrdersService } from './orders.service';

type FarmerRow = { id: string; name: string; location: number };
type KiranaRow = { id: string; shopName: string; location: number };

@Injectable({ providedIn: 'root' })
export class OrderFulfillmentService {
  constructor(
    private readonly http: HttpClient,
    private readonly inventoryStore: InventoryStoreService,
    private readonly ordersService: OrdersService
  ) {}

  /**
   * Uses order delivery date as inventory cutoff. Allocates from nearest farmers first;
   * deducts stock from the in-memory inventory store.
   */
  async fulfillOrder(orderId: string): Promise<{ error?: string }> {
    try {
      const order = this.ordersService.getById(orderId);
      if (!order) return { error: 'Order not found.' };
      if (order.status !== 'pending') return { error: 'Only pending orders can be fulfilled from here.' };

      let farmers: FarmerRow[];
      let kiranas: KiranaRow[];

      try {
        const masters = await firstValueFrom(
          forkJoin({
            farmers: this.http.get<FarmerRow[]>('assets/data/farmers.json').pipe(timeout(5000)),
            kiranas: this.http.get<KiranaRow[]>('assets/data/kiranas.json').pipe(timeout(5000))
          })
        );
        farmers = masters.farmers;
        kiranas = masters.kiranas;
      } catch (err) {
        return { error: 'Could not load master data. Please try again.' };
      }

      const kirana = kiranas.find((k) => k.id === order.kiranaId);
      if (!kirana) return { error: 'Kirana not found in master data.' };

      const inventoryCutoffDate = this.normalizeYmd(order.deliveryDate) || this.todayYmd();
      const detailLines: LineFulfillmentDetail[] = [];

      for (const line of order.lineItems) {
        const need = line.quantityKg;
        const pool = this.inventoryStore.aggregatedByFarmer(line.productId, undefined, inventoryCutoffDate);

        const withDistance = pool
          .map((row) => {
            const farmer = farmers.find((f) => f.id === row.farmerId);
            const farmerLocation = farmer?.location ?? Number.NaN;
            const distanceKm = Number.isFinite(farmerLocation)
              ? Math.abs(farmerLocation - kirana.location)
              : Number.POSITIVE_INFINITY;
            return { row, farmer, farmerLocation, distanceKm };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm);

        let remaining = need;
        const allocations: AllocationLine[] = [];

        for (const entry of withDistance) {
          if (remaining <= 0) break;
          if (!entry.farmer || !Number.isFinite(entry.farmerLocation)) continue;

          const available = entry.row.quantityKg;
          if (available <= 0) continue;

          const take = Math.min(available, remaining);
          allocations.push({
            farmerId: entry.row.farmerId,
            farmerName: entry.row.farmerName,
            quantityKg: take,
            distanceKm: entry.distanceKm,
            farmerLocationKm: entry.farmerLocation
          });

          this.inventoryStore.deduct(line.productId, entry.row.farmerId, take, undefined, inventoryCutoffDate);
          remaining -= take;

          entry.row.quantityKg -= take;
        }

        const shortfallKg = remaining > 0 ? remaining : 0;

        detailLines.push({
          productId: line.productId,
          productName: line.productName,
          requestedKg: need,
          shortfallKg,
          allocations
        });
      }

      const anyShort = detailLines.some((d) => d.shortfallKg > 0);
      const snapshot: OrderFulfillmentSnapshot = {
        computedAt: new Date().toISOString(),
        detailLines
      };

      this.ordersService.applyFulfillment(orderId, anyShort ? 'partially_fulfilled' : 'fulfilled', snapshot);
      return {};
    } catch (err) {
      console.error('Fulfillment error:', err);
      return { error: 'An error occurred during fulfillment. Please try again.' };
    }
  }

  private todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private normalizeYmd(raw: string): string {
    if (!raw) return '';
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
  }
}
