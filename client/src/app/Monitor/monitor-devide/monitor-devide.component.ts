import { Component } from '@angular/core';

const SERVER_PATH=window.location.origin;

@Component({
  selector: 'app-monitor-devide',
  templateUrl: './monitor-devide.component.html',
  styleUrls: ['./monitor-devide.component.css']
})
export class MonitorDevideComponent {
  rapport=false;
  show=false;
  dss!:string[];
  constructor(){
    (async()=>{
      await fetch(SERVER_PATH + '/diseases', {
          
        method: 'POST',
        //credentials:"include"
        // headers: {
        //   'Content-Type': 'application/json',
        // },
      })
        .then((res) => res.json())
        .then((value) => {
          if (value !== undefined) {
            console.log(value);
            this.dss=value;
          }
        });
    })();
  }
  showrapport(){
    this.rapport=true;
    this.show=true;
  }

  lstsugs(){
    let h:string="";
    for(let ds of this.dss){
      h+=" - " + ds ;
    }
    return h;
  }

  showsugs(){
    this.rapport=false
  }

}
