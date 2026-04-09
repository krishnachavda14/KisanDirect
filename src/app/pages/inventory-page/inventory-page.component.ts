import { Component, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { DynamicFormComponent } from '../../shared/dynamic-form/dynamic-form.component';
import { DynamicFormConfigService } from '../../shared/dynamic-form/dynamic-form-config.service';
import { AlertDialogService } from '../../shared/alert-dialog/alert-dialog.service';
import { InventoryStoreService } from '../../services/inventory-store.service';
import { InventoryEntry } from '../../models/inventory-entry.model';
import { inventoryFormConfig } from '../../shared/form-configs/inventory-form.config';

type Farmer = { id: string; name: string };
type Product = { id: string; name: string };

type InventoryEntryInput = {
  farmerId: string;
  productId: string;
  quantityKg: number | string;
  pricePerKg: number | string;
};

type InventoryFormSubmit = {
  value: {
    date: string;
    entries: InventoryEntryInput[];
  };
  isValid: boolean;
};

type ProductStockIndicator = {
  productId: string;
  productName: string;
  totalQuantityKg: number;
  level: 'green' | 'yellow' | 'red';
};

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.css'
})
export class InventoryPageComponent implements OnDestroy {
  @ViewChild(DynamicFormComponent) private dynamicForm?: DynamicFormComponent;

  todaysInventory: InventoryEntry[] = [];
  productIndicators: ProductStockIndicator[] = [];
  lowStockProductsCount = 0;
  activeInventoryDate = '';
  nextEntryNumber = 1;

  private farmers: Farmer[] = [];
  private products: Product[] = [];
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly configService: DynamicFormConfigService,
    private readonly http: HttpClient,
    private readonly inventoryStore: InventoryStoreService,
    private readonly alertDialogService: AlertDialogService
  ) {
    this.configService.setConfig(inventoryFormConfig);
    this.loadMasterData();
    const existingEntries = this.inventoryStore.snapshot();
    this.activeInventoryDate = this.getInitialActiveDate(existingEntries);

    const inventorySub = this.inventoryStore.entries$.subscribe((entries) => {
      if (!this.activeInventoryDate) {
        this.activeInventoryDate = this.getInitialActiveDate(entries);
      }
      this.refreshTodayView(entries);
    });

    this.subscriptions.add(inventorySub);
    this.refreshTodayView(existingEntries);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.configService.clearConfig();
  }

  async onInventorySubmit(event: InventoryFormSubmit): Promise<void> {
    const date = this.normalizeDate(event.value.date);
    const entries = event.value.entries ?? [];
    const acceptedEntries: InventoryEntry[] = [];

    for (let index = 0; index < entries.length; index++) {
      const row = entries[index];
      const rowNumber = index + 1;
      const reasons: string[] = [];

      const farmer = this.farmers.find((item) => item.id === row.farmerId);
      const product = this.products.find((item) => item.id === row.productId);

      const quantityKg = Number(row.quantityKg);
      const pricePerKg = Number(row.pricePerKg);

      if (!date) reasons.push('Date is required.');
      if (!row.farmerId) reasons.push('Farmer is required.');
      else if (!farmer) reasons.push('Farmer not found in master data.');

      if (!row.productId) reasons.push('Product is required.');
      else if (!product) reasons.push('Product not found in master data.');

      if (!Number.isFinite(quantityKg) || quantityKg < 1) reasons.push('Quantity must be at least 1 kg.');
      if (!Number.isFinite(pricePerKg) || pricePerKg < 1) reasons.push('Price must be at least Rs 1.');

      if (reasons.length > 0) {
        continue;
      }

      acceptedEntries.push({
        date,
        farmerId: row.farmerId,
        farmerName: farmer!.name,
        productId: row.productId,
        productName: product!.name,
        quantityKg,
        pricePerKg
      });

    }
    if (acceptedEntries.length > 0) {
      this.inventoryStore.addEntries(acceptedEntries);
      this.activeInventoryDate = date || this.todayYmd();
      this.nextEntryNumber += acceptedEntries.length;
      this.dynamicForm?.resetForm({ date: this.activeInventoryDate });
      this.refreshTodayView(this.inventoryStore.snapshot());
      const itemLabel = acceptedEntries.length === 1 ? 'item' : 'items';
      const message = `Farmer successfully added ${acceptedEntries.length} ${itemLabel}.`;
      await this.alertDialogService.alert('Success', message);
    }
  }

  isActiveDateToday(): boolean {
    return this.activeInventoryDate === this.todayYmd();
  }

  stockLevelLabel(level: ProductStockIndicator['level']): string {
    if (level === 'green') return 'Healthy';
    if (level === 'yellow') return 'Medium';
    return 'Low';
  }

  private refreshTodayView(entries: InventoryEntry[]): void {
    const dateToShow = this.activeInventoryDate || this.todayYmd();
    const todayRows = entries.filter((row) => this.normalizeDate(row.date) === dateToShow);
    this.todaysInventory = [...todayRows];

    const byProduct = new Map<string, ProductStockIndicator>();

    for (const row of todayRows) {
      const existing = byProduct.get(row.productId);
      if (existing) {
        existing.totalQuantityKg += row.quantityKg;
      } else {
        byProduct.set(row.productId, {
          productId: row.productId,
          productName: row.productName,
          totalQuantityKg: row.quantityKg,
          level: 'green'
        });
      }
    }

    const indicators = [...byProduct.values()].map((item) => {
      const level = this.stockLevel(item.totalQuantityKg);
      return {
        ...item,
        level
      };
    });

    indicators.sort((a, b) => a.productName.localeCompare(b.productName));
    this.productIndicators = indicators;
    this.lowStockProductsCount = indicators.filter((item) => item.level === 'red').length;
  }

  private stockLevel(totalQuantityKg: number): ProductStockIndicator['level'] {
    if (totalQuantityKg > 100) return 'green';
    if (totalQuantityKg >= 20) return 'yellow';
    return 'red';
  }

  private todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private normalizeDate(raw: string): string {
    if (!raw) return '';

    // Browser date inputs usually return YYYY-MM-DD. Keep as-is.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // Also support DD/MM/YYYY to avoid locale-format mismatches.
    const slashParts = raw.split('/');
    if (slashParts.length === 3) {
      const day = slashParts[0].padStart(2, '0');
      const month = slashParts[1].padStart(2, '0');
      const year = slashParts[2];
      if (/^\d{4}$/.test(year)) {
        return `${year}-${month}-${day}`;
      }
    }

    return raw;
  }

  private getInitialActiveDate(entries: InventoryEntry[]): string {
    if (entries.length === 0) {
      return this.todayYmd();
    }

    const latestEntry = entries[entries.length - 1];
    return this.normalizeDate(latestEntry.date) || this.todayYmd();
  }

  private loadMasterData(): void {
    this.http.get<Farmer[]>('assets/data/farmers.json').subscribe((data) => {
      this.farmers = data;
    });

    this.http.get<Product[]>('assets/data/products.json').subscribe((data) => {
      this.products = data;
    });
  }
}
