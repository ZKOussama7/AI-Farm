import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'client';

  constructor(private router:Router){
  }

  is_route(url:string):boolean{
    return (this.router.url==url);
  }

  key_click(evt:KeyboardEvent,callback:Function,args:any[],preventDflt=false){
    // console.log(evt.code);
    if(evt.code=="Enter"||evt.code=='Space'||evt.code=="NumpadEnter"){
      if(preventDflt)
        evt.preventDefault();
      callback(...args);
    }
  }
  cold_redirect=(url:string,evt:Event) =>{
    evt.preventDefault();
    this.router.navigate([url]);
  }
}
