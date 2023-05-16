import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeMainComponent } from './Home/home-main/home-main.component';
import { MonitorMainComponent } from './Monitor/monitor-main/monitor-main.component';
import { MonitorDevideComponent } from './Monitor/monitor-devide/monitor-devide.component';
import { HomeNfoundComponent } from './Home/home-nfound/home-nfound.component';
import { WebcamModule } from 'ngx-webcam';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TempComponent } from './Home/Sensors/temp/temp.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeMainComponent,
    MonitorMainComponent,
    MonitorDevideComponent,
    HomeNfoundComponent,
    TempComponent
  ],
  imports: [
    BrowserModule,
    WebcamModule,
    NgApexchartsModule,
    RouterModule.forRoot([
      {path:'',component:HomeMainComponent},
      {path:'monitor',component:MonitorMainComponent},
      {path:'divide',component:MonitorDevideComponent},
      {path:'**',component:HomeNfoundComponent},
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
