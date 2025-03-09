import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionsAdminComponent } from './transactions-admin.component';

describe('TransactionsAdminComponent', () => {
  let component: TransactionsAdminComponent;
  let fixture: ComponentFixture<TransactionsAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionsAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
