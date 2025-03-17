import { TestBed } from '@angular/core/testing';

import { MaxValueService } from './max-value.service';

describe('MaxValueService', () => {
  let service: MaxValueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaxValueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
