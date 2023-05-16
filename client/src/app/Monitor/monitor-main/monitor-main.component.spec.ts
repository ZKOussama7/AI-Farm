import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorMainComponent } from './monitor-main.component';

describe('MonitorMainComponent', () => {
  let component: MonitorMainComponent;
  let fixture: ComponentFixture<MonitorMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonitorMainComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonitorMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
