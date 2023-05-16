import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorDevideComponent } from './monitor-devide.component';

describe('MonitorDevideComponent', () => {
  let component: MonitorDevideComponent;
  let fixture: ComponentFixture<MonitorDevideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonitorDevideComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonitorDevideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
