import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Order, OrderLineItem, OrderStatus } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly orders: Order[] = [];
  private readonly subject = new BehaviorSubject<Order[]>([]);
  readonly orders$ = this.subject.asObservable();

  constructor() {
    this.seedDemoOrders();
    this.emit();
  }

  snapshot(): Order[] {
    return [...this.orders];
  }

  getById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  filterByStatus(filter: OrderStatus | 'fulfilled_all'): Order[] {
    if (filter === 'fulfilled_all') {
      return this.orders.filter((o) => o.status === 'fulfilled' || o.status === 'partially_fulfilled');
    }
    return this.orders.filter((o) => o.status === filter);
  }

  addOrder(input: {
    kiranaId: string;
    kiranaName: string;
    deliveryDate: string;
    notes: string;
    lineItems: OrderLineItem[];
  }): Order {
    const id = `O-${Date.now()}`;
    const order: Order = {
      id,
      kiranaId: input.kiranaId,
      kiranaName: input.kiranaName,
      deliveryDate: input.deliveryDate,
      notes: input.notes ?? '',
      status: 'pending',
      lineItems: input.lineItems.map((l) => ({ ...l }))
    };
    this.orders.unshift(order);
    this.emit();
    return order;
  }

  applyFulfillment(orderId: string, status: 'fulfilled' | 'partially_fulfilled', fulfillment: Order['fulfillment']): void {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return;
    order.status = status;
    order.fulfillment = fulfillment;
    this.emit();
  }

  private emit(): void {
    this.subject.next([...this.orders]);
  }

  private seedDemoOrders(): void {
    const demo: Order[] = [
      {
        id: 'O-demo-1',
        kiranaId: 'K3',
        kiranaName: 'Om Stores',
        deliveryDate: this.todayYmd(),
        notes: 'Bulk tomato',
        status: 'pending',
        lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 40 }]
      },
      {
        id: 'O-demo-2',
        kiranaId: 'K1',
        kiranaName: 'Sai Grocery',
        deliveryDate: this.todayYmd(),
        notes: '',
        status: 'assigned',
        lineItems: [
          { productId: 'P2', productName: 'Onion', quantityKg: 15 },
          { productId: 'P3', productName: 'Potato', quantityKg: 10 }
        ]
      },
      {
        id: 'O-demo-3',
        kiranaId: 'K6',
        kiranaName: 'Guru Traders',
        deliveryDate: this.todayYmd(),
        notes: 'Cancelled by ops',
        status: 'cancelled',
        lineItems: [{ productId: 'P4', productName: 'Banana', quantityKg: 5 }]
      },
      {
        id: 'O-demo-4',
        kiranaId: 'K4',
        kiranaName: 'Devi Provisions',
        deliveryDate: this.todayYmd(),
        notes: 'Earlier cycle',
        status: 'fulfilled',
        lineItems: [{ productId: 'P1', productName: 'Tomato', quantityKg: 12 }],
        fulfillment: {
          computedAt: new Date().toISOString(),
          detailLines: [
            {
              productId: 'P1',
              productName: 'Tomato',
              requestedKg: 12,
              shortfallKg: 0,
              allocations: []
            }
          ]
        }
      }
    ];

    this.orders.push(...demo);
  }

  private todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
