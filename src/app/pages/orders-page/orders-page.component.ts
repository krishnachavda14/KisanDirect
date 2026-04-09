import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { forkJoin } from 'rxjs';

import { Order } from '../../models/order.model';
import { DynamicFormComponent } from '../../shared/dynamic-form/dynamic-form.component';
import { DynamicFormConfigService } from '../../shared/dynamic-form/dynamic-form-config.service';
import { orderFormConfig } from '../../shared/form-configs/order-form.config';
import { OrderFulfillmentService } from '../../services/order-fulfillment.service';
import { OrdersService } from '../../services/orders.service';

type StatusFilter = 'pending' | 'assigned' | 'fulfilled' | 'cancelled';

type KiranaRow = { id: string; shopName: string };
type ProductRow = { id: string; name: string };

type OrderFormValue = {
  kiranaId: string;
  deliveryDate: string;
  notes?: string;
  lineItems: { productId: string; quantityKg: number | string }[];
};

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  activeFilter: StatusFilter = 'pending';
  orders: Order[] = [];
  selectedOrder: Order | null = null;

  showPlaceOrderForm = false;
  placeOrderMessage: string | null = null;
  assignMessage: string | null = null;
  fulfillMessage: string | null = null;
  assignBusy = false;
  fulfillBusy = false;
  placeOrderBusy = false;

  constructor(
    private readonly configService: DynamicFormConfigService,
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: OrderFulfillmentService,
    private readonly http: HttpClient
  ) {
    this.ordersService.orders$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.orders = list;
        this.syncSelectedOrder();
      });
  }

  ngOnDestroy(): void {
    this.configService.clearConfig();
  }

  filteredOrders(): Order[] {
    if (this.activeFilter === 'fulfilled') {
      return this.ordersService.filterByStatus('fulfilled_all');
    }
    return this.ordersService.filterByStatus(this.activeFilter);
  }

  setFilter(key: StatusFilter): void {
    this.activeFilter = key;
    this.selectedOrder = null;
  }

  openPlaceOrderForm(): void {
    this.placeOrderMessage = null;
    this.showPlaceOrderForm = true;
    this.configService.setConfig(orderFormConfig);
  }

  closePlaceOrderForm(): void {
    this.showPlaceOrderForm = false;
    this.configService.clearConfig();
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
    this.assignMessage = null;
    this.fulfillMessage = null;
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  async onOrderSubmit(event: { value: unknown; isValid: boolean }): Promise<void> {
    if (this.placeOrderBusy) return;
    if (!event.isValid) {
      this.placeOrderMessage = 'Please fix validation errors, then submit again.';
      return;
    }

    this.placeOrderBusy = true;

    const raw = event.value as OrderFormValue;
    const lineItems = raw.lineItems ?? [];

    try {
      const masters = await firstValueFrom(
        forkJoin({
          kiranas: this.http.get<KiranaRow[]>('assets/data/kiranas.json'),
          products: this.http.get<ProductRow[]>('assets/data/products.json')
        })
      );

      const kirana = masters.kiranas.find((k) => k.id === raw.kiranaId);
      const items = lineItems.map((line) => {
        const product = masters.products.find((p) => p.id === line.productId);
        return {
          productId: line.productId,
          productName: product?.name ?? line.productId,
          quantityKg: Number(line.quantityKg)
        };
      });

      this.ordersService.addOrder({
        kiranaId: raw.kiranaId,
        kiranaName: kirana?.shopName ?? raw.kiranaId,
        deliveryDate: raw.deliveryDate,
        notes: raw.notes ?? '',
        lineItems: items
      });

      this.placeOrderMessage = 'Order created and appears in Pending.';
      this.closePlaceOrderForm();
      this.setFilter('pending');
    } catch {
      this.placeOrderMessage = 'Could not load master data. Try again.';
    } finally {
      this.placeOrderBusy = false;
      this.cdr.markForCheck();
    }
  }

  async assignFarmers(): Promise<void> {
    if (!this.selectedOrder || this.selectedOrder.status !== 'pending') return;

    this.assignBusy = true;
    this.assignMessage = null;

    try {
      const result = await this.fulfillmentService.assignFarmersToOrder(this.selectedOrder.id);

      if (result.error) {
        this.assignMessage = result.error;
      } else {
        const updated = this.ordersService.getById(this.selectedOrder.id);
        this.selectedOrder = updated ?? null;
        
        if (updated?.status === 'cancelled') {
          this.assignMessage = 'No stock available for any product in this order. Order cancelled automatically.';
          this.setFilter('cancelled');
        } else if (updated?.status === 'assigned') {
          this.assignMessage = 'Farmers assigned successfully. You can now fulfill the order.';
          this.setFilter('assigned');
        }
      }
    } catch (err) {
      this.assignMessage = 'Assignment failed. Please try again.';
      console.error('Assignment error:', err);
    } finally {
      this.assignBusy = false;
      this.cdr.markForCheck();
    }
  }

  async fulfillSelected(): Promise<void> {
    if (!this.selectedOrder || this.selectedOrder.status !== 'assigned') return;

    this.fulfillBusy = true;
    this.fulfillMessage = null;

    try {
      const result = await this.fulfillmentService.fulfillOrder(this.selectedOrder.id);

      if (result.error) {
        this.fulfillMessage = result.error;
      } else {
        const updated = this.ordersService.getById(this.selectedOrder.id);
        this.selectedOrder = updated ?? null;
        const status = updated?.status;
        if (status === 'fulfilled') {
          this.fulfillMessage = 'Order fully fulfilled.';
          this.setFilter('fulfilled');
        } else if (status === 'partially_fulfilled') {
          this.fulfillMessage = 'Order partially fulfilled — see shortfall below.';
          this.setFilter('fulfilled');
        } else if (status === 'cancelled') {
          this.fulfillMessage = 'Order cancelled — no stock available.';
          this.setFilter('cancelled');
        }
      }
    } catch (err) {
      this.fulfillMessage = 'Fulfillment failed. Please try again.';
      console.error('Fulfillment error:', err);
    } finally {
      this.fulfillBusy = false;
      this.cdr.markForCheck();
    }
  }

  private syncSelectedOrder(): void {
    if (!this.selectedOrder) return;
    const updated = this.ordersService.getById(this.selectedOrder.id);
    this.selectedOrder = updated ?? null;
  }
}
