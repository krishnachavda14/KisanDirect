import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { InventoryEntry } from '../models/inventory-entry.model';

@Injectable({ providedIn: 'root' })
export class InventoryStoreService {
  private readonly entries: InventoryEntry[] = [];
  private readonly subject = new BehaviorSubject<InventoryEntry[]>([]);
  readonly entries$ = this.subject.asObservable();

  snapshot(): InventoryEntry[] {
    return [...this.entries];
  }

  addEntries(rows: InventoryEntry[]): void {
    this.entries.push(...rows.map((r) => ({ ...r })));
    this.emit();
  }

  /**
   * Stock available per farmer for one product.
   * If a date is provided, only rows for that date are included.
   */
  aggregatedByFarmer(
    productId: string,
    date?: string,
    maxDate?: string
  ): { farmerId: string; farmerName: string; quantityKg: number }[] {
    const map = new Map<string, { farmerId: string; farmerName: string; quantityKg: number }>();

    for (const row of this.entries) {
      if (row.productId !== productId) continue;
      if (date && row.date !== date) continue;
      if (!date && maxDate && row.date > maxDate) continue;
      if (row.quantityKg <= 0) continue;

      const key = row.farmerId;
      const existing = map.get(key);
      if (existing) {
        existing.quantityKg += row.quantityKg;
      } else {
        map.set(key, {
          farmerId: row.farmerId,
          farmerName: row.farmerName,
          quantityKg: row.quantityKg
        });
      }
    }

    return [...map.values()];
  }

  deduct(productId: string, farmerId: string, kg: number, date?: string, maxDate?: string): void {
    let remaining = kg;
    const eligibleRows = this.entries
      .filter((row) => {
        if (row.productId !== productId || row.farmerId !== farmerId) return false;
        if (date) return row.date === date;
        if (maxDate) return row.date <= maxDate;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const row of eligibleRows) {
      if (remaining <= 0) break;
      const take = Math.min(row.quantityKg, remaining);
      row.quantityKg -= take;
      remaining -= take;
    }

    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].quantityKg < 0.0001) {
        this.entries.splice(i, 1);
      }
    }

    this.emit();
  }

  private emit(): void {
    this.subject.next([...this.entries]);
  }
}
