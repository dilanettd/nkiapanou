import { Component, inject, OnInit } from '@angular/core';
import { IProduct } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product/product.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  searchKeyword: string = '';
  category: string = '';
  products: IProduct[] = [];
  currentPage: number = 1;
  pageSize: number = 12;
  totalItems: number = 0;
  totalPages: number = 0;

  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchKeyword = params['searchKeyword'] || '';
      this.currentPage = +params['page'] || 1;
      this.pageSize = +params['pageSize'] || 10;
      this.performSearch();
    });
  }

  performSearch() {
    const params = {
      keyword: this.searchKeyword,
      page: this.currentPage,
      limit: this.pageSize,
      category: this.category,
    };

    this.productService.searchProducts(params).subscribe({
      next: (response) => {
        this.products = response.data;
        this.currentPage = response.current_page;
        this.totalItems = response.total;
        this.totalPages = response.last_page;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche de produits :', error);
      },
    });
  }

  // Méthode pour changer de page
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateUrlParams();
      this.performSearch();
    }
  }

  // Méthodes pour la page suivante et précédente
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  // Génère un tableau pour les pages
  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Mise à jour de l'URL avec les paramètres actuels
  private updateUrlParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        searchKeyword: this.searchKeyword,
        page: this.currentPage,
        pageSize: this.pageSize,
      },
      queryParamsHandling: 'merge',
    });
  }
}
