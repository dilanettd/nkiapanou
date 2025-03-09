import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoundedAvatarComponent } from './rounded-avatar.component';

describe('RoundedAvatarComponent', () => {
  let component: RoundedAvatarComponent;
  let fixture: ComponentFixture<RoundedAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoundedAvatarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoundedAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
