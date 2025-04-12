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
    path: 'about-us',
    loadComponent: () =>
      import('./pages/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      ),
  },
  {
    path: 'payment',
    children: [
      {
        path: 'stripe',
        loadComponent: () =>
          import(
            './pages/payment/components/stripe-payment/stripe-payment.component'
          ).then((m) => m.StripePaymentComponent),
        canActivate: [authGuard],
      },
      {
        path: 'confirmation',
        loadComponent: () =>
          import(
            './pages/payment/components/payment-confirmation/payment-confirmation.component'
          ).then((m) => m.PaymentConfirmationComponent),
      },
    ],
  },
  {
    path: 'payment-delivery',
    loadComponent: () =>
      import('./pages/payment-delivery/payment-delivery.component').then(
        (m) => m.PaymentDeliveryComponent
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart.component').then((m) => m.CartComponent),
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
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/account/components/profile/profile.component').then(
            (m) => m.ProfileComponent
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
        path: 'address',
        loadComponent: () =>
          import('./pages/account/components/address/address.component').then(
            (m) => m.AddressComponent
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./pages/account/components/wishlist/wishlist.component').then(
            (m) => m.WishlistComponent
          ),
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
    path: 'product/:idOrSlug',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
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
        path: 'messages',
        loadComponent: () =>
          import('./pages/admin/components/messages/messages.component').then(
            (m) => m.MessagesComponent
          ),
      },
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./pages/admin/components/messages/messages.component').then(
            (m) => m.MessagesComponent
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import(
            './pages/admin/components/inventory-movement/inventory-movement.component'
          ).then((c) => c.InventoryMovementComponent),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/admin/components/reviews/reviews.component').then(
            (c) => c.ReviewsComponent
          ),
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
            './pages/admin/components/transactions/transactions.component'
          ).then((m) => m.TransactionsComponent),
      },
      {
        path: 'shipping',
        loadComponent: () =>
          import('./pages/admin/components/shipping/shipping.component').then(
            (m) => m.ShippingComponent
          ),
      },
      {
        path: 'newsletter',
        loadComponent: () =>
          import(
            './pages/admin/components/newsletter/newsletter.component'
          ).then((m) => m.NewsletterComponent),
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
