import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentDeliveryComponent } from './payment-delivery.component';

describe('PaymentDeliveryComponent', () => {
  let component: PaymentDeliveryComponent;
  let fixture: ComponentFixture<PaymentDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
