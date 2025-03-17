import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ICategory } from '../../../../../../core/models2/category.model';
import { IProduct } from '../../../../../../core/models2/product.model';
import { ProductSearchParams } from '../../../../../../core/services/product/product.service';

@Component({
  selector: 'nkiapanou-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent {
  @Input() products: IProduct[] = [];
  @Input() categories: ICategory[] = [];
  @Input() isLoading: boolean = false;
  @Input() searchParams: ProductSearchParams = {};
  @Input() totalPages: number = 1;

  @Output() editProduct = new EventEmitter<IProduct>();
  @Output() deleteProduct = new EventEmitter<number>();
  @Output() toggleStatus = new EventEmitter<IProduct>();
  @Output() toggleFeatured = new EventEmitter<IProduct>();
  @Output() updateSearchParams = new EventEmitter<
    Partial<ProductSearchParams>
  >();
  @Output() changePage = new EventEmitter<number>();

  searchTerm: string = '';
  selectedCategory: number | null = null;
  selectedStatus: 'all' | 'active' | 'inactive' | 'out_of_stock' = 'all';

  constructor() {}

  onSearchSubmit(): void {
    this.updateSearchParams.emit({
      search: this.searchTerm || undefined,
      category_id: this.selectedCategory || undefined,
      status: this.selectedStatus === 'all' ? undefined : this.selectedStatus,
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.selectedStatus = 'all';
    this.updateSearchParams.emit({
      search: undefined,
      category_id: undefined,
      status: undefined,
      page: 1,
    });
  }

  applySort(sortBy: string): void {
    const currentSortBy = this.searchParams.sort_by;
    const currentSortDirection = this.searchParams.sort_direction;

    // Si on clique sur la même colonne, on change la direction
    const newDirection =
      currentSortBy === sortBy && currentSortDirection === 'asc'
        ? 'desc'
        : 'asc';

    this.updateSearchParams.emit({
      sort_by: sortBy,
      sort_direction: newDirection,
    });
  }

  getSortDirection(column: string): string {
    if (this.searchParams.sort_by !== column) return '';
    return this.searchParams.sort_direction === 'asc' ? '↑' : '↓';
  }

  onEdit(product: IProduct): void {
    this.editProduct.emit(product);
  }

  onDelete(id: number): void {
    this.deleteProduct.emit(id);
  }

  onToggleStatus(product: IProduct): void {
    this.toggleStatus.emit(product);
  }

  onToggleFeatured(product: IProduct): void {
    this.toggleFeatured.emit(product);
  }

  onPageChange(page: number): void {
    this.changePage.emit(page);
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.name : 'Non catégorisé';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'out_of_stock':
        return 'Rupture';
      default:
        return status;
    }
  }

  getPages(): number[] {
    const pages = [];
    const currentPage = this.searchParams.page || 1;

    // Afficher seulement 5 pages max autour de la page courante
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(this.totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getPrimaryImage(product: IProduct): string {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.is_primary);
      if (primaryImage) {
        return primaryImage.image_path;
      }
      return product.images[0].image_path;
    }
    return (
      'https://placehold.co/100x100/eeede5/333333?text=' +
      encodeURIComponent(product.name)
    );
  }
}
