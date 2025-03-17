import { Component, OnInit, inject } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IUserAddress } from '../../../../core/models2/user.model';
import { AddressService } from '../../../../core/services/address/address.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent implements OnInit {
  addresses: IUserAddress[] = [];
  shippingAddresses: IUserAddress[] = [];
  billingAddresses: IUserAddress[] = [];

  loading: boolean = false;
  showAddForm: boolean = false;
  showEditForm: boolean = false;
  formSubmitting: boolean = false;

  selectedAddress: IUserAddress | null = null;
  addressForm: FormGroup;

  // Countries list
  countries: string[] = [
    'France',
    'Belgique',
    'Suisse',
    'Canada',
    'Luxembourg',
    'Allemagne',
    'Espagne',
    'Italie',
    'Royaume-Uni',
  ];

  // Injected services
  private addressService = inject(AddressService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  constructor() {
    this.addressForm = this.createAddressForm();
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  /**
   * Loads user addresses
   */
  loadAddresses(): void {
    this.loading = true;

    this.addressService.getUserAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.filterAddresses();
        this.loading = false;
      },
      error: (error) => {
        console.error('Detailed error loading addresses:', error);

        // Display more specific error message if available
        const errorMessage = this.getErrorMessage(
          error,
          'Error loading addresses'
        );
        this.toastr.error(errorMessage);

        this.loading = false;
      },
    });
  }

  /**
   * Filters addresses by type
   */
  filterAddresses(): void {
    this.shippingAddresses = this.addresses.filter(
      (addr) => addr.address_type === 'shipping'
    );
    this.billingAddresses = this.addresses.filter(
      (addr) => addr.address_type === 'billing'
    );
  }

  /**
   * Initializes address form
   */
  createAddressForm(address?: IUserAddress): FormGroup {
    return this.fb.group({
      address_type: [address?.address_type || 'shipping', Validators.required],
      is_default: [address?.is_default || false],
      recipient_name: [address?.recipient_name || '', Validators.required],
      address_line1: [address?.address_line1 || '', Validators.required],
      address_line2: [address?.address_line2 || ''],
      city: [address?.city || '', Validators.required],
      state_province: [address?.state_province || ''],
      postal_code: [address?.postal_code || '', Validators.required],
      country: [address?.country || 'France', Validators.required],
      phone_number: [
        address?.phone_number || '',
        [Validators.required, Validators.pattern('^[+]?[0-9]{10,15}$')],
      ],
    });
  }

  /**
   * Opens the add address form
   */
  openAddForm(): void {
    this.showAddForm = true;
    this.showEditForm = false;
    this.selectedAddress = null;
    this.addressForm = this.createAddressForm();
  }

  /**
   * Opens the edit address form
   */
  openEditForm(address: IUserAddress): void {
    this.selectedAddress = address;
    this.addressForm = this.createAddressForm(address);
    this.showEditForm = true;
    this.showAddForm = false;
  }

  /**
   * Closes all forms
   */
  closeForm(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedAddress = null;
    this.addressForm.reset();
  }

  /**
   * Extracts error message from error response
   */
  getErrorMessage(error: any, defaultMessage: string): string {
    if (error.error && typeof error.error.message === 'string') {
      return error.error.message;
    } else if (error.error && error.error.errors) {
      // If we have specific validation errors
      const validationErrors = Object.values(error.error.errors);
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        const firstError = validationErrors[0];
        if (
          Array.isArray(firstError) &&
          firstError.length > 0 &&
          typeof firstError[0] === 'string'
        ) {
          return firstError[0];
        }
      }
    }

    return defaultMessage;
  }

  /**
   * Saves a new address or updates an existing one
   */
  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.toastr.warning('Please correct the errors in the form');
      return;
    }

    this.formSubmitting = true;

    if (this.showAddForm) {
      // Add a new address
      this.addressService.addAddress(this.addressForm.value).subscribe({
        next: (address) => {
          this.addresses.push(address);
          this.filterAddresses();
          this.toastr.success('Address successfully added');
          this.closeForm();
          this.formSubmitting = false;
        },
        error: (error) => {
          console.error('Detailed error adding address:', error);

          const errorMessage = this.getErrorMessage(
            error,
            'Error adding address'
          );
          this.toastr.error(errorMessage);

          this.formSubmitting = false;
        },
      });
    } else if (this.showEditForm && this.selectedAddress) {
      // Update an existing address
      this.addressService
        .updateAddress(this.selectedAddress.id, this.addressForm.value)
        .subscribe({
          next: (address) => {
            const index = this.addresses.findIndex((a) => a.id === address.id);
            if (index !== -1) {
              this.addresses[index] = address;
            }
            this.filterAddresses();
            this.toastr.success('Address successfully updated');
            this.closeForm();
            this.formSubmitting = false;
          },
          error: (error) => {
            console.error('Detailed error updating address:', error);

            const errorMessage = this.getErrorMessage(
              error,
              'Error updating address'
            );
            this.toastr.error(errorMessage);

            this.formSubmitting = false;
          },
        });
    }
  }

  /**
   * Deletes an address
   */
  deleteAddress(address: IUserAddress): void {
    if (address.is_default) {
      this.toastr.warning('You cannot delete a default address');
      return;
    }

    if (confirm('Are you sure you want to delete this address?')) {
      this.loading = true;

      this.addressService.deleteAddress(address.id).subscribe({
        next: () => {
          this.addresses = this.addresses.filter((a) => a.id !== address.id);
          this.filterAddresses();
          this.toastr.success('Address successfully deleted');
          this.loading = false;
        },
        error: (error) => {
          console.error('Detailed error deleting address:', error);

          const errorMessage = this.getErrorMessage(
            error,
            'Error deleting address'
          );
          this.toastr.error(errorMessage);

          this.loading = false;
        },
      });
    }
  }

  /**
   * Sets an address as default
   */
  setDefaultAddress(address: IUserAddress): void {
    if (address.is_default) {
      return; // Already set as default
    }

    this.loading = true;

    this.addressService.setDefaultAddress(address.id).subscribe({
      next: (updatedAddress) => {
        // Update address in the list
        const index = this.addresses.findIndex(
          (a) => a.id === updatedAddress.id
        );
        if (index !== -1) {
          this.addresses[index] = updatedAddress;
        }

        // Update other addresses to reflect the change
        this.addresses.forEach((a) => {
          if (
            a.id !== updatedAddress.id &&
            a.address_type === updatedAddress.address_type
          ) {
            a.is_default = false;
          }
        });

        this.filterAddresses();
        this.toastr.success('Address set as default');
        this.loading = false;
      },
      error: (error) => {
        console.error('Detailed error setting default address:', error);

        const errorMessage = this.getErrorMessage(
          error,
          'Error setting default address'
        );
        this.toastr.error(errorMessage);

        this.loading = false;
      },
    });
  }

  /**
   * Formats address for display
   */
  formatAddress(address: IUserAddress): string {
    let formattedAddress = address.address_line1;

    if (address.address_line2) {
      formattedAddress += ', ' + address.address_line2;
    }

    formattedAddress += ', ' + address.postal_code + ' ' + address.city;

    if (address.state_province) {
      formattedAddress += ', ' + address.state_province;
    }

    formattedAddress += ', ' + address.country;

    return formattedAddress;
  }

  /**
   * Checks if a form field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.addressForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  /**
   * Gets error message for a form field
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.addressForm.get(fieldName);

    if (!field) return '';

    if (field.hasError('required')) {
      return 'This field is required';
    }

    if (field.hasError('pattern')) {
      if (fieldName === 'phone_number') {
        return 'Invalid phone number';
      }
    }

    return 'Invalid field';
  }
}
