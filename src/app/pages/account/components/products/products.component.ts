import { Component, inject, OnInit } from '@angular/core';
import { ProductService } from '../../../../core/services/product/product.service';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { IProduct } from '../../../../core/models/product.model';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'nkiapanou-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);

  products: IProduct[] = [];
  filteredProducts: IProduct[] = [];
  loading = false;
  error = false;
  filterStatus = 'all';

  ngOnInit(): void {
    this.getProducts();
  }

  getProducts(): void {
    this.loading = true;
    this.error = false;
    this.productService
      .getUserProducts()
      .pipe(
        finalize(() => (this.loading = false)),
        catchError(() => {
          this.error = true;
          return of([]);
        })
      )
      .subscribe((products) => {
        this.products = products;
        this.applyFilter();
      });
  }

  deleteProduct(id: number): void {
    this.loading = true;
    this.productService
      .deleteProductById(id)
      .pipe(
        finalize(() => (this.loading = false)),
        catchError(() => {
          this.error = true;
          return of(null);
        })
      )
      .subscribe(() => {
        this.products = this.products.filter((product) => product.id !== id);
        this.applyFilter();
      });
  }

  updateProduct(product: IProduct): void {
    this.loading = true;
    const updatedProduct = { ...product, name: 'Updated Product Name' };

    this.productService
      .addProduct(new FormData())
      .pipe(
        finalize(() => (this.loading = false)),
        catchError(() => {
          this.error = true;
          return of(null);
        })
      )
      .subscribe((newProduct) => {
        if (newProduct) {
          const index = this.products.findIndex((p) => p.id === newProduct.id);
          if (index !== -1) {
            this.products[index] = newProduct;
            this.applyFilter();
          }
        } else {
          console.error('Mise à jour échouée : Produit non valide');
        }
      });
  }

  applyFilter(): void {
    if (this.filterStatus === 'all') {
      this.filteredProducts = this.products;
    } else {
      const isActive = this.filterStatus === 'active';
      this.filteredProducts = this.products.filter(
        (product) => product.is_active === isActive
      );
    }
  }
}
