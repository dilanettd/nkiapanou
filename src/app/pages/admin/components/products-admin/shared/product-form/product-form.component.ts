import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
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
import { IProduct } from '../../../../../../core/models2/product.model';
import { ProductService } from '../../../../../../core/services/product/product.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'nkiapanou-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  @Input() product: IProduct | null = null;
  @Input() categories: ICategory[] = [];
  @Output() formSubmitted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);
  private imageCompress = inject(NgxImageCompressService);

  productForm!: FormGroup;
  isSubmitting = false;
  isUploading = false;
  compressInProgress = false;
  compressedImageRatio = 0;
  autoGenerateSkuFromName = true; // Pour suivre si on doit générer le SKU automatiquement

  previewImages: {
    url: string;
    isPrimary: boolean;
    file?: File;
    id?: number;
    compressRatio?: number;
  }[] = [];

  ngOnInit(): void {
    this.initForm();

    if (this.product) {
      this.populateForm();
      this.loadProductImages();
    }
  }

  initForm(): void {
    const generatedSku = this.generateSku();

    this.productForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      discount_price: [null],
      category_id: [null, Validators.required],
      status: ['active', Validators.required],
      featured: [false],
      sku: [generatedSku, Validators.required],
      origin_country: [''],
      weight: [null],
      dimensions: [''],
      packaging: [''],
      low_stock_threshold: [5],
    });

    // Lorsque le nom du produit change, on peut optionnellement mettre à jour le SKU
    // si l'utilisateur n'a pas encore modifié manuellement le SKU
    const nameControl = this.productForm.get('name');
    if (nameControl) {
      this.autoGenerateSkuFromName = true; // Tracker si on génère automatiquement

      nameControl.valueChanges.subscribe((newName) => {
        if (this.autoGenerateSkuFromName && newName && newName.length > 2) {
          const skuControl = this.productForm.get('sku');
          if (skuControl) {
            skuControl.setValue(this.generateSkuFromName(newName), {
              emitEvent: false,
            });
          }
        }
      });
    }
  }

  // Générer un SKU aléatoire au format PRD-XXXXXX (où X est un caractère alphanumérique)
  generateSku(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PRD-';

    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return result;
  }

  // Générer un SKU basé sur le nom du produit
  generateSkuFromName(name: string): string {
    // Prendre les 3 premières lettres du nom, les convertir en majuscules
    // et ajouter un nombre aléatoire
    let prefix = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    if (prefix.length < 3) {
      // Compléter avec des lettres si le nom est trop court
      prefix = prefix.padEnd(3, 'X');
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000); // Nombre entre 1000 et 9999

    return `${prefix}-${randomNum}`;
  }

  // On désactive la génération automatique quand l'utilisateur modifie manuellement le SKU
  onSkuManualEdit(): void {
    this.autoGenerateSkuFromName = false;
  }

  // Régénérer un nouveau SKU sur demande de l'utilisateur
  regenerateSku(): void {
    const newSku = this.generateSku();
    this.productForm.get('sku')?.setValue(newSku);
    this.autoGenerateSkuFromName = false; // Désactiver la génération automatique basée sur le nom
  }

  populateForm(): void {
    if (!this.product) return;

    this.productForm.patchValue({
      name: this.product.name,
      description: this.product.description,
      price: this.product.price,
      discount_price: this.product.discount_price,
      category_id: this.product.category_id,
      status: this.product.status,
      featured: this.product.featured,
      sku: this.product.sku,
      origin_country: this.product.origin_country,
      weight: this.product.weight,
      dimensions: this.product.dimensions,
      packaging: this.product.packaging,
      low_stock_threshold: this.product.low_stock_threshold,
    });
  }

  loadProductImages(): void {
    if (this.product && this.product.images) {
      this.previewImages = this.product.images.map((img) => ({
        url: img.image_path,
        isPrimary: img.is_primary,
        id: img.id,
      }));
    }
  }

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length) {
      this.isUploading = true;
      const file = input.files[0];

      // Vérification du type et de la taille du fichier
      if (!file.type.includes('image/')) {
        this.toastr.error('Veuillez sélectionner un fichier image', 'Erreur');
        this.isUploading = false;
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10 MB - on peut accepter des fichiers plus gros car on va les compresser
        this.toastr.error("L'image ne doit pas dépasser 10 Mo", 'Erreur');
        this.isUploading = false;
        return;
      }

      try {
        this.compressInProgress = true;

        // Création d'un URL temporaire pour la prévisualisation avant compression
        const originalImageUrl = URL.createObjectURL(file);

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
          this.compressedImageRatio = ratio;

          // Upload de l'image compressée
          this.uploadCompressedImage(compressedResult, file.name, ratio);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        this.toastr.error("Erreur lors de la compression de l'image", 'Erreur');
        console.error("Erreur lors de la compression de l'image", error);
        this.compressInProgress = false;
        this.isUploading = false;
      }
    }
  }

  // Nouvelle méthode pour uploader l'image compressée
  uploadCompressedImage(
    base64Image: string,
    fileName: string,
    compressRatio: number
  ): void {
    // Conversion du base64 en blob
    const block = base64Image.split(';');
    const contentType = block[0].split(':')[1];
    const realData = block[1].split(',')[1];
    const blob = this.b64toBlob(realData, contentType);

    // Création du fichier à partir du blob
    const newFileName = 'compressed_' + fileName;
    const file = new File([blob], newFileName, { type: contentType });

    // Upload via le service existant
    this.productService.uploadProductImage(file).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          // Ajouter l'image à la liste des aperçus
          const isPrimary = this.previewImages.length === 0; // La première image est principale par défaut
          this.previewImages.push({
            url: response.url,
            isPrimary,
            file,
            compressRatio,
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
        this.compressInProgress = false;
        this.isUploading = false;
      },
      error: (error) => {
        this.toastr.error("Erreur lors du téléchargement de l'image", 'Erreur');
        console.error("Erreur lors du téléchargement de l'image", error);
        this.compressInProgress = false;
        this.isUploading = false;
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

  removeImage(index: number): void {
    const imageToRemove = this.previewImages[index];

    // Si c'est un produit existant et que l'image a un ID, on l'a supprime du serveur
    if (this.product && imageToRemove.id) {
      this.productService
        .deleteProductImage(this.product.id, imageToRemove.id)
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.previewImages.splice(index, 1);

              // Si l'image supprimée était principale et qu'il reste des images,
              // on définit la première comme principale
              if (imageToRemove.isPrimary && this.previewImages.length > 0) {
                this.previewImages[0].isPrimary = true;
              }

              this.toastr.success('Image supprimée avec succès', 'Succès');
            } else {
              this.toastr.error(response.message, 'Erreur');
            }
          },
          error: (error) => {
            this.toastr.error(
              "Erreur lors de la suppression de l'image",
              'Erreur'
            );
            console.error("Erreur lors de la suppression de l'image", error);
          },
        });
    } else {
      // Pour une nouvelle image, on la supprime simplement de l'aperçu
      this.previewImages.splice(index, 1);

      // Si l'image supprimée était principale et qu'il reste des images,
      // on définit la première comme principale
      if (imageToRemove.isPrimary && this.previewImages.length > 0) {
        this.previewImages[0].isPrimary = true;
      }
    }
  }

  setAsPrimary(index: number): void {
    if (this.product) {
      const imageId = this.previewImages[index].id;
      if (imageId) {
        this.productService
          .setProductImageAsPrimary(this.product.id, imageId)
          .subscribe({
            next: (response) => {
              if (response.status === 'success') {
                // Mettre à jour les états isPrimary
                this.previewImages.forEach((img, i) => {
                  img.isPrimary = i === index;
                });

                this.toastr.success('Image définie comme principale', 'Succès');
              } else {
                this.toastr.error(response.message, 'Erreur');
              }
            },
            error: (error) => {
              this.toastr.error(
                "Erreur lors de la définition de l'image principale",
                'Erreur'
              );
              console.error(
                "Erreur lors de la définition de l'image principale",
                error
              );
            },
          });
      }
    } else {
      // Pour un nouveau produit, on met simplement à jour l'état localement
      this.previewImages.forEach((img, i) => {
        img.isPrimary = i === index;
      });
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      // Marquer tous les champs comme touched pour afficher les erreurs
      Object.keys(this.productForm.controls).forEach((key) => {
        const control = this.productForm.get(key);
        control?.markAsTouched();
      });

      this.toastr.error(
        'Veuillez corriger les erreurs du formulaire',
        'Erreur'
      );
      return;
    }

    if (this.previewImages.length === 0) {
      this.toastr.error('Veuillez ajouter au moins une image', 'Erreur');
      return;
    }

    const productData = this.productForm.value;
    this.isSubmitting = true;

    if (this.product) {
      // Mise à jour d'un produit existant
      this.productService
        .updateProduct(this.product.id, productData)
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.formSubmitted.emit();
              this.toastr.success('Produit mis à jour avec succès', 'Succès');
            } else {
              this.toastr.error(
                'Erreur lors de la mise à jour du produit',
                'Erreur'
              );
            }
            this.isSubmitting = false;
          },
          error: (error) => {
            this.toastr.error(
              'Erreur lors de la mise à jour du produit',
              'Erreur'
            );
            console.error('Erreur lors de la mise à jour du produit', error);
            this.isSubmitting = false;
          },
        });
    } else {
      // Création d'un nouveau produit avec les images

      // Préparer les données d'images pour l'API
      const imageData = this.previewImages.map((img) => ({
        url: img.url,
        isPrimary: img.isPrimary,
      }));

      // Utiliser le service modifié qui gère les images directement
      this.productService.createProduct(productData, imageData).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastr.success('Produit créé avec succès', 'Succès');
            this.formSubmitted.emit();
          } else {
            this.toastr.error(
              'Erreur lors de la création du produit',
              'Erreur'
            );
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error('Erreur lors de la création du produit', 'Erreur');
          console.error('Erreur lors de la création du produit', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  // Fonctions utilitaires pour accéder aux contrôles du formulaire
  get name() {
    return this.productForm.get('name');
  }
  get price() {
    return this.productForm.get('price');
  }
  get category_id() {
    return this.productForm.get('category_id');
  }
  get sku() {
    return this.productForm.get('sku');
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }
}
