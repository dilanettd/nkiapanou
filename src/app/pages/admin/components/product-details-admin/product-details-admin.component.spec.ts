import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductDetailsAdminComponent } from './product-details-admin.component';

describe('ProductDetailsAdminComponent', () => {
  let component: ProductDetailsAdminComponent;
  let fixture: ComponentFixture<ProductDetailsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductDetailsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
