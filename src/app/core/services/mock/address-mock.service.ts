import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IUserAddress } from '../../models2/user.model';

@Injectable({
  providedIn: 'root',
})
export class AddressMockService {
  private mockAddresses: IUserAddress[] = [
    {
      id: 1,
      user_id: 1,
      address_type: 'shipping',
      is_default: true,
      recipient_name: 'Jean Dupont',
      address_line1: '123 Rue de Paris',
      address_line2: 'Apt 4B',
      city: 'Paris',
      state_province: 'Île-de-France',
      postal_code: '75001',
      country: 'France',
      phone_number: '+33612345678',
      created_at: '2023-05-15T10:30:00',
      updated_at: '2023-05-15T10:30:00',
    },
    {
      id: 2,
      user_id: 1,
      address_type: 'billing',
      is_default: true,
      recipient_name: 'Jean Dupont',
      address_line1: '45 Avenue des Champs-Élysées',
      city: 'Paris',
      postal_code: '75008',
      country: 'France',
      phone_number: '+33612345678',
      created_at: '2023-05-15T10:35:00',
      updated_at: '2023-05-15T10:35:00',
    },
    {
      id: 3,
      user_id: 1,
      address_type: 'shipping',
      is_default: false,
      recipient_name: 'Jean Dupont',
      address_line1: '78 Rue du Bac',
      city: 'Lyon',
      state_province: 'Auvergne-Rhône-Alpes',
      postal_code: '69001',
      country: 'France',
      phone_number: '+33698765432',
      created_at: '2023-07-20T14:20:00',
      updated_at: '2023-07-20T14:20:00',
    },
  ];

  constructor() {}

  /**
   * Récupère la liste des adresses de l'utilisateur
   */
  getUserAddresses(): Observable<IUserAddress[]> {
    // Simuler un délai de réseau
    return of([...this.mockAddresses]).pipe(delay(500));
  }

  /**
   * Récupère une adresse spécifique par son ID
   */
  getAddressById(addressId: number): Observable<IUserAddress | undefined> {
    const address = this.mockAddresses.find((addr) => addr.id === addressId);
    if (!address) {
      return throwError(() => new Error('Address not found'));
    }
    return of(address).pipe(delay(300));
  }

  /**
   * Ajoute une nouvelle adresse
   */
  addAddress(
    address: Omit<IUserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Observable<IUserAddress> {
    const now = new Date().toISOString();
    const newAddress: IUserAddress = {
      ...address,
      id: this.getNextId(),
      user_id: 1, // User ID mockée
      created_at: now,
      updated_at: now,
    };

    // Si cette adresse est définie par défaut, mettre à jour les autres adresses du même type
    if (newAddress.is_default) {
      this.updateDefaultAddresses(newAddress.address_type);
    }

    this.mockAddresses.push(newAddress);
    return of(newAddress).pipe(delay(500));
  }

  /**
   * Met à jour une adresse existante
   */
  updateAddress(
    addressId: number,
    addressData: Partial<IUserAddress>
  ): Observable<IUserAddress> {
    const index = this.mockAddresses.findIndex((addr) => addr.id === addressId);
    if (index === -1) {
      return throwError(() => new Error('Address not found'));
    }

    // Si cette adresse est définie par défaut, mettre à jour les autres adresses du même type
    if (addressData.is_default) {
      this.updateDefaultAddresses(this.mockAddresses[index].address_type);
    }

    const updatedAddress: IUserAddress = {
      ...this.mockAddresses[index],
      ...addressData,
      updated_at: new Date().toISOString(),
    };

    this.mockAddresses[index] = updatedAddress;
    return of(updatedAddress).pipe(delay(500));
  }

  /**
   * Supprime une adresse
   */
  deleteAddress(addressId: number): Observable<boolean> {
    const index = this.mockAddresses.findIndex((addr) => addr.id === addressId);
    if (index === -1) {
      return throwError(() => new Error('Address not found'));
    }

    // Vérifier si c'est une adresse par défaut
    const addressToDelete = this.mockAddresses[index];
    if (addressToDelete.is_default) {
      return throwError(() => new Error('Cannot delete default address'));
    }

    this.mockAddresses.splice(index, 1);
    return of(true).pipe(delay(500));
  }

  /**
   * Définit une adresse comme adresse par défaut
   */
  setDefaultAddress(addressId: number): Observable<IUserAddress> {
    const address = this.mockAddresses.find((addr) => addr.id === addressId);
    if (!address) {
      return throwError(() => new Error('Address not found'));
    }

    // Mettre à jour les autres adresses du même type
    this.updateDefaultAddresses(address.address_type);

    // Définir cette adresse comme adresse par défaut
    address.is_default = true;
    address.updated_at = new Date().toISOString();

    return of(address).pipe(delay(500));
  }

  /**
   * Méthode utilitaire pour obtenir le prochain ID disponible
   */
  private getNextId(): number {
    return Math.max(...this.mockAddresses.map((addr) => addr.id), 0) + 1;
  }

  /**
   * Méthode utilitaire pour mettre à jour les adresses par défaut
   * pour un type d'adresse spécifique
   */
  private updateDefaultAddresses(addressType: 'shipping' | 'billing'): void {
    this.mockAddresses.forEach((addr) => {
      if (addr.address_type === addressType && addr.is_default) {
        addr.is_default = false;
        addr.updated_at = new Date().toISOString();
      }
    });
  }
}
