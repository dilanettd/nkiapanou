import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxImageCompressService } from 'ngx-image-compress';
import { ToastrService } from 'ngx-toastr';
import { ProductService } from '../../../../core/services/product/product.service';
import { ButtonSpinnerComponent } from '../../../../shared/components/button-spinner/button-spinner.component';

@Component({
  selector: 'nkiapanou-add-product',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    ButtonSpinnerComponent,
  ],
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.scss'],
})
export class AddProductComponent implements OnInit {
  step: number = 1;
  uploadedImages: { url: string; file: File }[] = [];
  maxImages: number = 5;
  isLoading: boolean = false;

  productForm!: FormGroup;

  categories = [
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Furniture' },
  ];

  constructor(
    private fb: FormBuilder,
    private imageCompress: NgxImageCompressService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  initializeForms() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      brand: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      stock_quantity: ['', Validators.required],
      description: ['', Validators.required],
      currency: ['XAF', Validators.required],
      installment_count: [1, [Validators.required, Validators.min(1)]],
      min_installment_price: [1, [Validators.required, Validators.min(1)]],
    });
  }

  handleNext() {
    if (
      this.step === 1 &&
      this.productForm.get('name')?.valid &&
      this.productForm.get('category')?.valid &&
      this.productForm.get('installment_count')?.valid
    ) {
      this.step++;
    } else if (
      this.step === 2 &&
      this.productForm.get('price')?.valid &&
      this.productForm.get('min_installment_price')?.valid &&
      this.productForm.get('stock_quantity')?.valid
    ) {
      this.step++;
    } else if (this.step === 3 && this.productForm.get('description')?.valid) {
      this.step++;
    } else {
      this.productForm.markAllAsTouched();
    }
  }

  handlePrevious() {
    if (this.step > 1) {
      this.step--;
    }
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  async handleSubmit() {
    if (this.uploadedImages.length < 2) {
      this.toastr.error('Vous devez télécharger au moins 2 images.');
      return;
    }

    this.isLoading = true;

    try {
      const files = await this.resizeImages(this.uploadedImages);
      const formData = new FormData();
      const product = this.productForm.value;
      Object.keys(product).forEach((key) => {
        formData.append(key, product[key]);
      });

      files.forEach((file) => formData.append('images[]', file));

      await this.productService.addProduct(formData).toPromise();
      this.toastr.success('Votre annonce a été ajoutée avec succès.');
      this.modalService.dismissAll();
    } catch (error) {
      this.toastr.error("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      this.isLoading = false;
    }
  }

  uploadImage(event: any) {
    const files: FileList = event.target.files;

    if (files.length + this.uploadedImages.length > this.maxImages) {
      this.toastr.warning(
        `Vous ne pouvez pas télécharger plus de ${this.maxImages} images.`
      );
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedImages.push({
          url: e.target.result,
          file: file,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  deleteImage(image: any) {
    this.uploadedImages = this.uploadedImages.filter((img) => img !== image);
  }

  async resizeImages(files: { url: string; file: File }[]): Promise<File[]> {
    const resizedFiles: File[] = [];

    for (const fileObj of files) {
      try {
        const file = await this.resizeImageFromUrl(fileObj.url);
        resizedFiles.push(file);
      } catch (error) {
        console.error("Erreur lors de la compression de l'image:", error);
      }
    }

    return resizedFiles;
  }

  private resizeImageFromUrl(url: string): Promise<File> {
    return new Promise<File>((resolve, reject) => {
      const byteCharacters = atob(url.split(',')[1]);
      const byteNumbers = new Uint8Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
      const fileName = 'image.jpg';

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target) {
          const base64Data = event.target.result as string;

          try {
            const result = await this.imageCompress.compressFile(
              base64Data,
              1,
              100,
              100,
              1200,
              1200
            );
            const compressedFile = base64toFile(result, fileName, 'image/jpeg');
            resolve(compressedFile);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('File reading failed.'));
        }
      };

      reader.readAsDataURL(blob);
    });
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}

function base64toFile(base64: string, filename: string, mimeType: string) {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new File([ab], filename, { type: mimeType });
}
