import { Component, inject, OnInit } from '@angular/core';
import { IProduct } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product/product.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'nkiapanou-products-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './products-admin.component.html',
  styleUrls: ['./products-admin.component.scss'],
})
export class ProductsAdminComponent implements OnInit {
  productService = inject(ProductService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  toastr = inject(ToastrService);

  products: IProduct[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 12;
  totalItems: number = 0;
  isLoading: boolean = true;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchTerm = params['search'] || '';
      this.currentPage = +params['page'] || 1;
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.isLoading = true;

    const filters = {
      search: this.searchTerm,
      page: this.currentPage,
      pageSize: this.pageSize,
    };

    this.productService.getAdminProducts(filters).subscribe({
      next: (response: { data: IProduct[]; totalItems: number }) => {
        this.products = response.data;
        this.totalItems = response.totalItems;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      },
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.currentPage = 1;
    this.updateUrl();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.updateUrl();
  }

  updateUrl(): void {
    const queryParams = {
      search: this.searchTerm || null,
      page: this.currentPage !== 1 ? this.currentPage : null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });

    this.loadProducts();
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(price);
  }

  deleteProduct(productId: number): void {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this product?'
    );

    if (confirmDelete) {
      this.productService.deleteProductById(productId).subscribe({
        next: () => {
          this.toastr.success('Product deleted successfully!');
          this.loadProducts();
        },
        error: (error) => {
          console.error('Error deleting product', error);
          this.toastr.error('Failed to delete product.');
        },
      });
    }
  }
}
