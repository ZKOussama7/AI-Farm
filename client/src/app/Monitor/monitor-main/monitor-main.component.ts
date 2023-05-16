import { Component, OnInit } from '@angular/core';
import { WebcamImage, WebcamInitError } from 'ngx-webcam/public_api';
import { Subject } from 'rxjs';

const SERVER_PATH=window.location.origin;

@Component({
  selector: 'app-monitor-main',
  templateUrl: './monitor-main.component.html',
  styleUrls: ['./monitor-main.component.css'],
})
export class MonitorMainComponent {
  ///} implements OnInit {
  webwidth = window.innerWidth;
  webheight = window.innerHeight - 270;
  error = false;
  public videoOptions: MediaTrackConstraints = {
    width: { ideal: this.webwidth },
    height: { ideal: this.webheight },
    noiseSuppression: false,
  };
  cr_img: WebcamImage | undefined = undefined;
  trig: Subject<void> = new Subject<void>();
  count = -1;
  dss:any;

  key_click(
    evt: KeyboardEvent,
    callback: Function,
    args: any[] | undefined = undefined,
    preventDflt = false
  ) {
    // console.log(evt.code);
    if (
      evt.code == 'Enter' ||
      evt.code == 'Space' ||
      evt.code == 'NumpadEnter'
    ) {
      if (preventDflt) evt.preventDefault();
      if (!!args) callback(...args);
      else callback();
    }
  }

  start_mon() {
    (() => {
      fetch(SERVER_PATH + '/api/monitor', {
        method: 'POST',
        body: JSON.stringify({
          type: 'start',
        }),
        // headers: {
        //   'Content-Type': 'application/json',
        // },
      })
        .then((res) => res.json())
        .then((value) => {
          if (value.timestamp !== undefined) this.count = value.count??0;
        });
    })();
  }

  seterror(evt: WebcamInitError) {
    console.log(evt);
    this.error = true;
  }

  trig_img() {

    this.trig.next();
  }

  capture_img(evt: WebcamImage) {
    this.cr_img = evt;
    // TODO: read locations and send it with the image
    fetch(SERVER_PATH + '/api/monitor', {
      method: 'POST',
      body: JSON.stringify({
        type: 'send',
        file: {
          img: this.cr_img.imageAsBase64,
          location: '//TODO:Location',
          timestamp: new Date(),
        },
      }),
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    }).then(text=>text.json()).then((value) => {
      if (value.done) 
        this.count=value.file_count??this.count+1;
      else{
        this.count=-1;
      }
      return;
    });
    
  }

  finish_end(){
    fetch(SERVER_PATH + '/api/monitor', {
      method: 'POST',
      body: JSON.stringify({
        type: 'end'
      }),
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    }).then(text=>text.json()).then((value) => {
      // if (value.done) 
        this.dss = JSON.stringify(value.diseases).replace("{","").replace("}","").replace(","," - ");
        this.count=-1;
      return;
    });
  }
}
