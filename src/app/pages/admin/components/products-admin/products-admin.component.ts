import { Component, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ICategory } from '../../../../core/models/category.model';
import { IProduct } from '../../../../core/models/product.model';
import { CategoryService } from '../../../../core/services/category/category.service';
import {
  ProductService,
  ProductSearchParams,
} from '../../../../core/services/product/product.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CategoryManagementComponent } from './shared/category-management/category-management.component';
import { ProductFormComponent } from './shared/product-form/product-form.component';
import { ProductListComponent } from './shared/product-list/product-list.component';

@Component({
  selector: 'nkiapanou-products-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ProductFormComponent,
    CategoryManagementComponent,
    ProductListComponent,
  ],
  templateUrl: './products-admin.component.html',
  styleUrls: ['./products-admin.component.scss'],
})
export class ProductsAdminComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toastr = inject(ToastrService);

  currentView = signal<'list' | 'add' | 'edit' | 'categories'>('list');
  isLoading = signal<boolean>(false);
  products = signal<IProduct[]>([]);
  categories = signal<ICategory[]>([]);
  selectedProduct = signal<IProduct | null>(null);

  // Paramètres de recherche et pagination
  searchParams = signal<ProductSearchParams>({
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_direction: 'desc',
  });

  totalProducts = signal<number>(0);
  totalPages = signal<number>(0);

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getProducts(this.searchParams()).subscribe({
      next: (response) => {
        this.products.set(response.data.products);
        this.totalProducts.set(response.data.total);
        this.totalPages.set(response.data.last_page);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement des produits', 'Erreur');
        console.error('Erreur lors du chargement des produits', error);
        this.isLoading.set(false);
      },
    });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement des catégories', 'Erreur');
        console.error('Erreur lors du chargement des catégories', error);
      },
    });
  }

  setView(view: 'list' | 'add' | 'edit' | 'categories'): void {
    this.currentView.set(view);
    if (view === 'add') {
      this.selectedProduct.set(null);
    }
  }

  editProduct(product: IProduct): void {
    this.selectedProduct.set(product);
    this.currentView.set('edit');
  }

  deleteProduct(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.isLoading.set(true);
      this.productService.deleteProduct(id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastr.success(response.message, 'Succès');
            this.loadProducts(); // Recharger la liste
          } else {
            this.toastr.error(response.message, 'Erreur');
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la suppression du produit',
            'Erreur'
          );
          console.error('Erreur lors de la suppression du produit', error);
          this.isLoading.set(false);
        },
      });
    }
  }

  onProductCreated(): void {
    this.toastr.success('Produit créé avec succès', 'Succès');
    this.currentView.set('list');
    this.loadProducts();
  }

  onProductUpdated(): void {
    this.toastr.success('Produit mis à jour avec succès', 'Succès');
    this.currentView.set('list');
    this.loadProducts();
  }

  onCategoryUpdated(): void {
    this.loadCategories();
  }

  updateSearchParams(newParams: Partial<ProductSearchParams>): void {
    this.searchParams.update((params) => ({
      ...params,
      ...newParams,
      // Si on change un paramètre autre que la page, on revient à la page 1
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
    this.loadProducts();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.updateSearchParams({ page });
  }

  toggleProductStatus(product: IProduct): void {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    this.productService.updateProductStatus(product.id, newStatus).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.toastr.success(`Statut du produit mis à jour`, 'Succès');
          this.loadProducts(); // Recharger la liste
        } else {
          this.toastr.error(
            'Erreur lors de la mise à jour du statut',
            'Erreur'
          );
        }
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la mise à jour du statut', 'Erreur');
        console.error('Erreur lors de la mise à jour du statut', error);
      },
    });
  }

  toggleProductFeatured(product: IProduct): void {
    this.productService.toggleProductFeatured(product.id).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.toastr.success(`Statut "Mis en avant" mis à jour`, 'Succès');
          this.loadProducts(); // Recharger la liste
        } else {
          this.toastr.error('Erreur lors de la mise à jour', 'Erreur');
        }
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la mise à jour', 'Erreur');
        console.error('Erreur lors de la mise à jour', error);
      },
    });
  }
}
