import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { switchMap, of } from 'rxjs';
import { IInventoryMovement } from '../../../../core/models/inventory-movement.model';
import { IProduct } from '../../../../core/models/product.model';
import { InventoryMovementService } from '../../../../core/services/inventory-movement/inventory-movement.service';
import { ProductService } from '../../../../core/services/product/product.service';

@Component({
  selector: 'nkiapanou-inventory-movement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory-movement.component.html',
  styleUrl: './inventory-movement.component.scss',
})
export class InventoryMovementComponent implements OnInit {
  private inventoryMovementService = inject(InventoryMovementService);
  private productService = inject(ProductService);
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Display properties
  movements: IInventoryMovement[] = [];
  products: IProduct[] = [];
  loading = true;
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  displayedColumns: string[] = [
    'id',
    'date',
    'product',
    'quantity',
    'type',
    'reference',
    'notes',
    'admin',
  ];

  // Filter properties
  filterForm!: FormGroup;
  referenceTypes = [
    { value: '', label: 'Tous les types' },
    { value: 'initial', label: 'Initial' },
    { value: 'order', label: 'Commande' },
    { value: 'manual', label: 'Manuel' },
    { value: 'return', label: 'Retour' },
    { value: 'adjustment', label: 'Ajustement' },
  ];

  // Form for adding new movement
  newMovementForm!: FormGroup;
  showNewMovementForm = false;

  ngOnInit(): void {
    this.initFilterForm();
    this.initNewMovementForm();
    this.loadProducts();
    this.loadMovements();
  }

  private initFilterForm(): void {
    this.filterForm = this.formBuilder.group({
      product_id: [''],
      reference_type: [''],
      start_date: [''],
      end_date: [''],
    });

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1; // Reset to first page when filters change
      this.loadMovements();
    });
  }

  private initNewMovementForm(): void {
    this.newMovementForm = this.formBuilder.group({
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.pattern(/^-?\d+$/)]],
      reference_type: ['manual', Validators.required],
      reference_id: [''],
      notes: ['', Validators.maxLength(255)],
    });

    // Add conditional validation for reference_id
    this.newMovementForm
      .get('reference_type')
      ?.valueChanges.subscribe((value) => {
        const referenceIdControl = this.newMovementForm.get('reference_id');
        if (value === 'order' || value === 'return') {
          referenceIdControl?.setValidators([Validators.required]);
        } else {
          referenceIdControl?.clearValidators();
        }
        referenceIdControl?.updateValueAndValidity();
      });
  }

  loadProducts(): void {
    this.productService.getProducts({ limit: 100 }).subscribe((response) => {
      if (response.status === 'success') {
        this.products = response.data.products;
      }
    });
  }

  loadMovements(): void {
    this.loading = true;

    // Get filter values
    const filters = {
      ...this.filterForm.value,
      page: this.currentPage,
      limit: this.pageSize,
    };

    // Remove empty filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === '' || filters[key] === null) {
        delete filters[key];
      }
    });

    this.inventoryMovementService.getInventoryMovements(filters).subscribe(
      (response) => {
        if (response.status === 'success') {
          this.movements = response.data.movements;
          this.totalItems = response.data.total;
        } else {
          this.toastr.error(
            "Erreur lors du chargement des mouvements d'inventaire",
            'Erreur'
          );
        }
        this.loading = false;
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        this.loading = false;
      }
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadMovements();
  }

  changePageSize(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.pageSize = parseInt(selectElement.value, 10);
    this.currentPage = 1; // Reset to first page when changing page size
    this.loadMovements();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pageCount = this.totalPages;

    // Show maximum 5 page buttons
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // Complex pagination logic for many pages
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5, -1, pageCount];
    } else if (this.currentPage >= pageCount - 2) {
      return [
        1,
        -1,
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
    } else {
      return [
        1,
        -1,
        this.currentPage - 1,
        this.currentPage,
        this.currentPage + 1,
        -1,
        pageCount,
      ];
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      product_id: '',
      reference_type: '',
      start_date: '',
      end_date: '',
    });
    this.currentPage = 1;
    this.loadMovements();
  }

  toggleNewMovementForm(): void {
    this.showNewMovementForm = !this.showNewMovementForm;
    if (!this.showNewMovementForm) {
      this.newMovementForm.reset({
        reference_type: 'manual',
      });
    }
  }

  addMovement(): void {
    if (this.newMovementForm.invalid) {
      this.toastr.error(
        'Veuillez corriger les erreurs dans le formulaire',
        'Erreur de validation'
      );
      return;
    }

    const movementData = this.newMovementForm.value;

    // Verify the product exists
    this.productService
      .getProductById(movementData.product_id)
      .pipe(
        switchMap((product) => {
          if (!product) {
            this.toastr.error('Produit introuvable', 'Erreur');
            return of(null);
          }

          // Check if this would result in negative inventory
          if (product.quantity + movementData.quantity < 0) {
            this.toastr.error(
              'Cette opération entraînerait un stock négatif',
              'Erreur'
            );
            return of(null);
          }

          return this.inventoryMovementService.createInventoryMovement(
            movementData
          );
        })
      )
      .subscribe(
        (response) => {
          if (response && response.status === 'success') {
            this.toastr.success(
              "Mouvement d'inventaire ajouté avec succès",
              'Succès'
            );
            this.toggleNewMovementForm();
            this.loadMovements();
          }
        },
        (error) => {
          this.toastr.error(
            "Erreur lors de l'ajout du mouvement d'inventaire",
            'Erreur'
          );
        }
      );
  }

  getProductName(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    return product ? product.name : `Produit #${productId}`;
  }

  getTypeLabel(type: string): string {
    return this.inventoryMovementService.getReferenceTypeLabel(type);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getQuantityClass(quantity: number): string {
    return quantity >= 0 ? 'text-green-600' : 'text-red-600';
  }
}
