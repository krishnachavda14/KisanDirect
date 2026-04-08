export type OrderStatus = 'pending' | 'assigned' | 'fulfilled' | 'cancelled' | 'partially_fulfilled';

export type OrderLineItem = {
  productId: string;
  productName: string;
  quantityKg: number;
};

export type AllocationLine = {
  farmerId: string;
  farmerName: string;
  quantityKg: number;
  /** Distance from farmer to kirana along the highway (absolute km difference). */
  distanceKm: number;
  farmerLocationKm: number;
};

export type LineFulfillmentDetail = {
  productId: string;
  productName: string;
  requestedKg: number;
  shortfallKg: number;
  allocations: AllocationLine[];
};

export type OrderFulfillmentSnapshot = {
  detailLines: LineFulfillmentDetail[];
  computedAt: string;
};

export type Order = {
  id: string;
  kiranaId: string;
  kiranaName: string;
  deliveryDate: string;
  notes: string;
  status: OrderStatus;
  lineItems: OrderLineItem[];
  fulfillment?: OrderFulfillmentSnapshot;
};
