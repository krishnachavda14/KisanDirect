import { Routes } from '@angular/router';
import { InventoryPageComponent } from './pages/inventory-page/inventory-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
  { path: 'inventory', component: InventoryPageComponent },
  { path: 'orders', component: OrdersPageComponent },
  { path: '**', redirectTo: 'inventory' }
];
