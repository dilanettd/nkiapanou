import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgxImageCompressService } from 'ngx-image-compress';
import { ICategory } from '../../../../../../core/models2/category.model';
import { CategoryService } from '../../../../../../core/services/category/category.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-category-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.scss',
})
export class CategoryManagementComponent implements OnInit {
  @Input() categories: ICategory[] = [];
  @Output() categoryUpdated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private toastr = inject(ToastrService);
  private imageCompress = inject(NgxImageCompressService);

  categoryForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditing = signal<boolean>(false);
  selectedCategory = signal<ICategory | null>(null);
  currentView = signal<'list' | 'form'>('list');

  // Nouvelles propriétés pour la prévisualisation d'image
  imagePreview = signal<string | null>(null);
  compressedImageRatio = signal<number>(100);
  compressInProgress = signal<boolean>(false);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.categoryForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      description: [''],
      parent_id: [null],
      status: ['active', Validators.required],
      image: [''],
    });
  }

  resetForm(): void {
    this.categoryForm.reset({
      status: 'active',
    });
    this.isEditing.set(false);
    this.selectedCategory.set(null);
    this.imagePreview.set(null);
    this.compressedImageRatio.set(100);
  }

  setView(view: 'list' | 'form'): void {
    this.currentView.set(view);
    if (view === 'form') {
      this.resetForm();
    }
  }

  editCategory(category: ICategory): void {
    this.isEditing.set(true);
    this.selectedCategory.set(category);
    this.currentView.set('form');

    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      parent_id: category.parent_id,
      status: category.status,
      image: category.image,
    });

    // Set image preview if the category has an image
    if (category.image) {
      this.imagePreview.set(category.image);
    }
  }

  deleteCategory(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      this.isLoading = true;
      this.categoryService.deleteCategory(id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastr.success(response.message, 'Succès');
            this.categoryUpdated.emit();
          } else {
            this.toastr.error(response.message, 'Erreur');
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la suppression de la catégorie',
            'Erreur'
          );
          console.error('Erreur lors de la suppression de la catégorie', error);
          this.isLoading = false;
        },
      });
    }
  }

  toggleCategoryStatus(category: ICategory): void {
    this.categoryService.toggleCategoryStatus(category.id).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.toastr.success(`Statut de la catégorie mis à jour`, 'Succès');
          this.categoryUpdated.emit();
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

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length) {
      const file = input.files[0];

      // Vérification du type
      if (!file.type.includes('image/')) {
        this.toastr.error('Veuillez sélectionner un fichier image', 'Erreur');
        return;
      }

      // On procède à la compression d'image
      try {
        this.compressInProgress.set(true);

        // Création d'un URL temporaire pour la prévisualisation avant compression
        const originalImageUrl = URL.createObjectURL(file);
        this.imagePreview.set(originalImageUrl);

        // Conversion en base64 pour la compression
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          const originalBase64 = e.target.result as string;

          // Compression de l'image
          const compressedResult = await this.imageCompress.compressFile(
            originalBase64,
            -1, // orientation auto
            80, // initial quality
            70 // target ratio of compression
          );

          // On estime le ratio de compression pour l'afficher
          const originalSize = originalBase64.length;
          const compressedSize = compressedResult.length;
          const ratio = Math.round((compressedSize / originalSize) * 100);
          this.compressedImageRatio.set(ratio);

          // Mise à jour de la prévisualisation
          this.imagePreview.set(compressedResult);

          // Upload de l'image compressée
          this.uploadCompressedImage(compressedResult);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        this.toastr.error("Erreur lors de la compression de l'image", 'Erreur');
        console.error("Erreur lors de la compression de l'image", error);
        this.compressInProgress.set(false);
      }
    }
  }

  // Nouvelle méthode pour uploader l'image compressée
  uploadCompressedImage(base64Image: string): void {
    // Conversion du base64 en blob
    const block = base64Image.split(';');
    const contentType = block[0].split(':')[1];
    const realData = block[1].split(',')[1];
    const blob = this.b64toBlob(realData, contentType);

    // Création du fichier à partir du blob
    const fileName = 'compressed_image_' + new Date().getTime() + '.jpg';
    const file = new File([blob], fileName, { type: contentType });

    // Upload via le service existant
    this.categoryService.uploadCategoryImage(file).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.categoryForm.patchValue({
            image: response.url,
          });
          this.toastr.success(
            'Image téléchargée et compressée avec succès',
            'Succès'
          );
        } else {
          this.toastr.error(
            "Erreur lors du téléchargement de l'image",
            'Erreur'
          );
        }
        this.compressInProgress.set(false);
      },
      error: (error) => {
        this.toastr.error("Erreur lors du téléchargement de l'image", 'Erreur');
        console.error("Erreur lors du téléchargement de l'image", error);
        this.compressInProgress.set(false);
      },
    });
  }

  // Utilitaire pour convertir un base64 en Blob
  b64toBlob(
    b64Data: string,
    contentType: string = '',
    sliceSize: number = 512
  ): Blob {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  clearImage(): void {
    this.categoryForm.patchValue({ image: '' });
    this.imagePreview.set(null);
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      // Marquer tous les champs comme touched pour afficher les erreurs
      Object.keys(this.categoryForm.controls).forEach((key) => {
        const control = this.categoryForm.get(key);
        control?.markAsTouched();
      });

      this.toastr.error(
        'Veuillez corriger les erreurs du formulaire',
        'Erreur'
      );
      return;
    }

    const categoryData = this.categoryForm.value;
    this.isSubmitting = true;

    if (this.isEditing() && this.selectedCategory()) {
      // Mise à jour d'une catégorie existante
      this.categoryService
        .updateCategory(this.selectedCategory()!.id, categoryData)
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.toastr.success(
                'Catégorie mise à jour avec succès',
                'Succès'
              );
              this.categoryUpdated.emit();
              this.currentView.set('list');
            } else {
              this.toastr.error(
                'Erreur lors de la mise à jour de la catégorie',
                'Erreur'
              );
            }
            this.isSubmitting = false;
          },
          error: (error) => {
            this.toastr.error(
              'Erreur lors de la mise à jour de la catégorie',
              'Erreur'
            );
            console.error(
              'Erreur lors de la mise à jour de la catégorie',
              error
            );
            this.isSubmitting = false;
          },
        });
    } else {
      // Création d'une nouvelle catégorie
      this.categoryService.createCategory(categoryData).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastr.success('Catégorie créée avec succès', 'Succès');
            this.categoryUpdated.emit();
            this.currentView.set('list');
          } else {
            this.toastr.error(
              'Erreur lors de la création de la catégorie',
              'Erreur'
            );
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la création de la catégorie',
            'Erreur'
          );
          console.error('Erreur lors de la création de la catégorie', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  // Fonctions utilitaires pour accéder aux contrôles du formulaire
  get name() {
    return this.categoryForm.get('name');
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.categoryForm.get(fieldName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  getParentCategories(): ICategory[] {
    return this.categories.filter((c) => !c.parent_id);
  }

  getCategoryParentName(category: ICategory): string {
    if (!category.parent_id) return '';
    const parent = this.categories.find((c) => c.id === category.parent_id);
    return parent ? parent.name : '';
  }

  hasSubcategories(categoryId: number): boolean {
    return this.categories.some((c) => c.parent_id === categoryId);
  }

  getSubcategories(categoryId: number): ICategory[] {
    return this.categories.filter((c) => c.parent_id === categoryId);
  }
}
