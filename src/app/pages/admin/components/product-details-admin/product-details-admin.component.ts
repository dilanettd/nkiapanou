// product-details-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { switchMap } from 'rxjs/operators';
import { IProduct } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product/product.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  selector: 'app-product-details-admin',
  templateUrl: './product-details-admin.component.html',
  styleUrls: ['./product-details-admin.component.scss'],
})
export class ProductDetailsAdminComponent implements OnInit {
  product!: IProduct;
  currentImageIndex: number = 0;
  isLoading: boolean = true;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private productService: ProductService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadProduct();
  }

  private loadProduct(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.productService.getProductById(id).subscribe({
        next: (product) => {
          this.product = product;
          this.isLoading = false;
        },
        error: (error) => {
          this.toastr.error('Erreur lors du chargement du produit', 'Erreur');
          this.isLoading = false;
        },
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  nextImage(): void {
    this.currentImageIndex =
      this.currentImageIndex === this.product.images.length - 1
        ? 0
        : this.currentImageIndex + 1;
  }

  previousImage(): void {
    this.currentImageIndex =
      this.currentImageIndex === 0
        ? this.product.images.length - 1
        : this.currentImageIndex - 1;
  }

  onActiveToggle(): void {
    this.productService.toggleProductActive(this.product.id).subscribe({
      next: () => {
        this.product.is_active = !this.product.is_active;
        const status = this.product.is_active ? 'activé' : 'désactivé';
        this.toastr.success(`Le produit a été ${status}`, 'Succès');
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la modification du statut', 'Erreur');
      },
    });
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }
}
