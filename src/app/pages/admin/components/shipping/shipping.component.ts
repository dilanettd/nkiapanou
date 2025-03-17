import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { IShippingFormula } from '../../../../core/models2/order.model';
import { ShippingService } from '../../../../core/services/shipping/shipping.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-shipping',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shipping.component.html',
  styleUrl: './shipping.component.scss',
})
export class ShippingComponent implements OnInit {
  shippingFormulas: IShippingFormula[] = [];
  countries: { code: string; name: string }[] = [];
  showNewFormulaForm = false;
  editingFormula: IShippingFormula | null = null;
  shippingForm: FormGroup;
  loading = false;
  submitting = false;

  constructor(
    private shippingService: ShippingService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.shippingForm = this.createShippingForm();
  }

  ngOnInit(): void {
    this.loadShippingFormulas();
    this.loadCountries();
  }

  createShippingForm(formula?: IShippingFormula): FormGroup {
    return this.fb.group({
      country_code: [
        formula?.country_code || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(2)],
      ],
      country_name: [formula?.country_name || '', [Validators.required]],
      base_fee: [
        formula?.base_fee || 5,
        [Validators.required, Validators.min(0)],
      ],
      price_per_kg: [
        formula?.price_per_kg || 1,
        [Validators.required, Validators.min(0)],
      ],
      price_per_cubic_meter: [
        formula?.price_per_cubic_meter || null,
        [Validators.min(0)],
      ],
      min_shipping_fee: [
        formula?.min_shipping_fee || 10,
        [Validators.required, Validators.min(0)],
      ],
      max_weight: [formula?.max_weight || null, [Validators.min(0)]],
      currency: [formula?.currency || 'EUR', [Validators.required]],
      handling_fee_percentage: [
        formula?.handling_fee_percentage || 0,
        [Validators.min(0), Validators.max(100)],
      ],
      is_active: [formula?.is_active !== undefined ? formula.is_active : true],
      notes: [formula?.notes || ''],
    });
  }

  loadShippingFormulas(): void {
    this.loading = true;
    this.shippingService
      .getAllShippingFormulas()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.shippingFormulas = response.data;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors du chargement des formules de livraison',
            'Erreur'
          );
          console.error('Error loading shipping formulas:', error);
        },
      });
  }

  loadCountries(): void {
    this.shippingService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
      },
      error: (error) => {
        console.error('Error loading countries:', error);
      },
    });
  }

  toggleNewFormulaForm(): void {
    this.showNewFormulaForm = !this.showNewFormulaForm;
    if (this.showNewFormulaForm && this.editingFormula === null) {
      this.shippingForm = this.createShippingForm();
    }
  }

  onCountrySelect(event: any): void {
    const countryCode = event.target.value;
    if (countryCode) {
      const selectedCountry = this.countries.find(
        (c) => c.code === countryCode
      );
      if (selectedCountry) {
        this.shippingForm.patchValue({
          country_name: selectedCountry.name,
        });
      }
    }
  }

  saveShippingFormula(): void {
    if (this.shippingForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.shippingForm.controls).forEach((key) => {
        const control = this.shippingForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const formulaData = this.shippingForm.value;

    if (this.editingFormula) {
      // Mise à jour d'une formule existante
      this.shippingService
        .updateShippingFormula(this.editingFormula.id, formulaData)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (response) => {
            this.toastr.success(
              'Formule de livraison mise à jour avec succès',
              'Succès'
            );
            this.loadShippingFormulas();
            this.resetForm();
          },
          error: (error) => {
            this.toastr.error(
              'Erreur lors de la mise à jour de la formule de livraison',
              'Erreur'
            );
            console.error('Error updating shipping formula:', error);
          },
        });
    } else {
      // Création d'une nouvelle formule
      this.shippingService
        .createShippingFormula(formulaData)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (response) => {
            this.toastr.success(
              'Formule de livraison créée avec succès',
              'Succès'
            );
            this.loadShippingFormulas();
            this.resetForm();
          },
          error: (error) => {
            this.toastr.error(
              'Erreur lors de la création de la formule de livraison',
              'Erreur'
            );
            console.error('Error creating shipping formula:', error);
          },
        });
    }
  }

  editFormula(formula: IShippingFormula): void {
    this.editingFormula = formula;
    this.shippingForm = this.createShippingForm(formula);
    this.showNewFormulaForm = true;
    // Faire défiler vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteFormula(formula: IShippingFormula): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer la formule de livraison pour ${formula.country_name} ?`
      )
    ) {
      this.shippingService.deleteShippingFormula(formula.id).subscribe({
        next: () => {
          this.toastr.success(
            'Formule de livraison supprimée avec succès',
            'Succès'
          );
          this.loadShippingFormulas();
          if (this.editingFormula?.id === formula.id) {
            this.resetForm();
          }
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la suppression de la formule de livraison',
            'Erreur'
          );
          console.error('Error deleting shipping formula:', error);
        },
      });
    }
  }

  toggleFormulaStatus(formula: IShippingFormula): void {
    const updatedFormula = {
      ...formula,
      is_active: !formula.is_active,
    };

    this.shippingService
      .updateShippingFormula(formula.id, { is_active: !formula.is_active })
      .subscribe({
        next: () => {
          this.toastr.success(
            `Formule de livraison ${
              formula.is_active ? 'désactivée' : 'activée'
            } avec succès`,
            'Succès'
          );
          this.loadShippingFormulas();
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la modification du statut de la formule',
            'Erreur'
          );
          console.error('Error toggling formula status:', error);
        },
      });
  }

  resetForm(): void {
    this.editingFormula = null;
    this.shippingForm = this.createShippingForm();
    this.showNewFormulaForm = false;
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }
}
