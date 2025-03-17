import { TestBed } from '@angular/core/testing';

import { InventoryMovementService } from './inventory-movement.service';

describe('InventoryMovementService', () => {
  let service: InventoryMovementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventoryMovementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
