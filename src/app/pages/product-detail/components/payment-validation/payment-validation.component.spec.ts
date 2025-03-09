import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentValidationComponent } from './payment-validation.component';

describe('PaymentValidationComponent', () => {
  let component: PaymentValidationComponent;
  let fixture: ComponentFixture<PaymentValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentValidationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
