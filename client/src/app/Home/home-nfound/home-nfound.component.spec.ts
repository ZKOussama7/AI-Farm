import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeNfoundComponent } from './home-nfound.component';

describe('HomeNfoundComponent', () => {
  let component: HomeNfoundComponent;
  let fixture: ComponentFixture<HomeNfoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HomeNfoundComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeNfoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
