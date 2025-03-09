import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewShopComponent } from './review-shop.component';

describe('ReviewShopComponent', () => {
  let component: ReviewShopComponent;
  let fixture: ComponentFixture<ReviewShopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewShopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewShopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
