import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AdminLayoutComponent } from './pages/admin/layout/admin-layout/admin-layout.component';
import { LoginAdminComponent } from './pages/admin/components/login-admin/login-admin.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'products',
    component: ProductListComponent,
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact-us/contact-us.component').then(
        (m) => m.ContactUsComponent
      ),
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./pages/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent
      ),
  },
  {
    path: 'admin/login',
    component: LoginAdminComponent,
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./pages/account/account.component').then(
        (m) => m.AccountComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './pages/account/components/dashboard/dashboard.component'
          ).then((m) => m.DashboardComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/account/components/products/products.component').then(
            (m) => m.ProductsComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/account/components/orders/orders.component').then(
            (m) => m.OrdersComponent
          ),
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import(
            './pages/account/components/purchases/purchases.component'
          ).then((m) => m.PurchasesComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/account/components/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'kyc',
        loadComponent: () =>
          import('./pages/account/components/kyc/kyc.component').then(
            (m) => m.KycComponent
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import(
            './pages/account/components/transactions/transactions.component'
          ).then((m) => m.TransactionsComponent),
      },
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
    ],
  },
  {
    path: 'account/verify',
    loadComponent: () =>
      import(
        './pages/account-confirmation/account-confirmation.component'
      ).then((m) => m.AccountConfirmationComponent),
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import(
        './pages/terms-and-conditions/terms-and-conditions.component'
      ).then((m) => m.TermsAndConditionsComponent),
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
  },
  {
    path: 'shop/:id',
    loadComponent: () =>
      import('./pages/seller-details/seller-details.component').then(
        (m) => m.SellerDetailsComponent
      ),
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './pages/admin/components/dashboard-admin/dashboard-admin.component'
          ).then((m) => m.DashboardAdminComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import(
            './pages/admin/components/products-admin/products-admin.component'
          ).then((m) => m.ProductsAdminComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import(
            './pages/admin/components/product-details-admin/product-details-admin.component'
          ).then((m) => m.ProductDetailsAdminComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import(
            './pages/admin/components/users-admin/users-admin.component'
          ).then((m) => m.UsersAdminComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import(
            './pages/admin/components/orders-admin/orders-admin.component'
          ).then((m) => m.OrdersAdminComponent),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import(
            './pages/admin/components/transactions-admin/transactions-admin.component'
          ).then((m) => m.TransactionsAdminComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import(
            './pages/admin/components/settings-admin/settings-admin.component'
          ).then((m) => m.SettingsAdminComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/not-found' },
];
