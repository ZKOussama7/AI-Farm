import { Component, Input, ViewChild,OnDestroy, Output } from '@angular/core';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke
} from "ng-apexcharts"; 

export type ChartOptions = {
  series: ApexAxisChartSeries;//{name:string,data:[number,number][]}[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  colors:string[];
};

const SERVER_PATH=window.location.origin;


@Component({
  selector: 'app-temp',
  templateUrl: './temp.component.html',
  styleUrls: ['./temp.component.css']
})
export class TempComponent  implements OnDestroy{
  
  @Input("width") mywidth:string='100%';
  @Input("height") myheight:string='100%';
  @Input("color") mycolor:any="#90B3F9";
  @Input("precision") avgprecision:number=15;
  @Input("type") mytype:string="Temp";
  @Input("name") myname:string="Temperature";
  @Input("unit") myunit:string="°C";
  @ViewChild("chart",{ static: false }) chart!: ChartComponent;
  @Output("update") 
  public chartOptions: Partial<ChartOptions>;

  started:boolean=false;
  lastknowndata!:number;
  lastknowndata_1!:number;
  lastindex!:number;
  lastavg!:number;
  fulldata!:[number,number][];
  avrgddata!:[number,number][];
  showndata!:[number,number][];
  intvl:any;
  realtime:boolean=false;
  constructor() {
    this.chartOptions = {
      series: [
        {
          name: this.myname,
          data: this.fulldata,
          color:this.mycolor,     
        },
      ],
      chart: {
        toolbar:{
          show:false,
        },
        foreColor:'#FFFFFF',
        height: 350,
        type: "area",
      },
      dataLabels: {
        enabled: false,
      },
      yaxis:{
        decimalsInFloat:2,
        labels:{
          formatter: (value)=> {
            return Number(value).toFixed(2) + this.myunit;
          }
        }
      },
      stroke: {
        curve: "smooth"
      },
      xaxis: {
        type: "numeric",
        labels: {
          show:false,
        }
      },
      tooltip: {
        x: {
          format: "dd/MM/yy HH:mm"
        },
        theme:"dark"
      },
      colors:[
        "#2192FF",
        "#38E54D",
        "#FDFF00",
        "#9CFF2E"
      ]
    };
    this.fetchlst().then(async ()=>{
      await this.fetchdata().then(()=>{
        this.intvl=setInterval(async ()=>(this.refresh()),2000);
      });
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intvl);
  }

 async fetchlst(){
        await fetch(SERVER_PATH + '/api', {
          
          method: 'POST',
          body: JSON.stringify({
            time: 'LAST',
          }),
          //credentials:"include"
          // headers: {
          //   'Content-Type': 'application/json',
          // },
        })
          .then((res) => res.json())
          .then((value) => {
            if (value.time !== undefined) {
              if(this.started)
                this.lastknowndata_1=this.lastknowndata;
              this.lastknowndata = value.time??(new Date()).getTime();
              console.log(this.lastknowndata);
            }
          });
  }

  averagedata(){
    console.log(this.showndata.length);
    let mxcnt = Math.ceil(this.showndata.length/this.avgprecision);
    let tmparr:[number,number][]=new Array<[number,number]>();
    for(let i = 0 ;i<this.avgprecision;i++){
      tmparr[i]=[i,0];
    }
    this.showndata.forEach((val,idx)=>{
      // if(idx>60024)
      //   debugger;
      const tidx = Math.floor(idx/mxcnt);
      const tcnt =idx%mxcnt+1;
      tmparr[tidx][1]=tmparr[tidx][1] - (tmparr[tidx][1]/tcnt) + (val[1]/tcnt);
    });
    this.avrgddata=tmparr;
    return this.avrgddata;
  }

 async fetchdata(){
      await fetch(SERVER_PATH + '/api', {
        
        method: 'POST',
        body: JSON.stringify({
          from:0,
          to:this.lastknowndata,
          type:this.mytype
        }),
        //credentials:"include"
        // headers: {
        //   'Content-Type': 'application/json',
        // },
      })
        .then((res) => res.json())
        .then((value:{data:{timestamp:Date,value:number}[],avg:number,lstime:number}) => {
          let dt = value.data;
          dt.sort((a,b)=>(new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime()));
          this.fulldata= dt.map((val,idx)=>[idx,val.value]);
          this.showndata=this.fulldata;
          this.chartOptions.series=[
            {
              name: this.myname,
              data: this.averagedata(),
              color:this.mycolor,    
            },
          ];
          this.lastavg=value.avg;
          this.lastindex=dt.length-1;
          this.started=true;
        });
  }
  async fetchndata(){
    await fetch(SERVER_PATH + '/api', {
        
      method: 'POST',
      body: JSON.stringify({
        from:this.lastknowndata,
        to:new Date().getTime(),//-30*1000,
        type:this.mytype
      }),
      //credentials:"include"
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    })
      .then((res) => res.json())
      .then((value:{data:{timestamp:Date,value:number}[],avg:number,lstime:number}) => {
        let dt = value.data;
        dt.sort((a,b)=>(new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime()));
        this.fulldata=this.fulldata.concat(dt.map((val,idx)=>[idx+1+this.lastindex,val.value]));
        this.showndata=this.fulldata.slice(-60,undefined);
        this.chartOptions.series=[
          {
            name: this.myname,
            data: this.averagedata(),
            color:this.mycolor,    
          },
        ];
        this.lastavg=this.lastavg-(this.lastavg/(this.lastindex+1)) + ( value.avg/(this.lastindex+1));
        this.lastindex=this.fulldata.length-1;
        this.lastknowndata=value.lstime;
      });
  }

  async refresh(){
    await this.fetchlst();
    if(this.lastknowndata<=this.lastknowndata_1){
      this.realtime=false;
      return;
    }
    await this.fetchndata();
    this.realtime=true;
    return;
  }
  // public updateSeries() {
  //   console.log(this.chart);
  //   if(this.chartOptions.series===undefined)
  //     return;
    
  //   this.chartOptions.series = [{
  //     name: "Temperature",
  //     data: [...this.chartOptions.series[0].data.slice(1,undefined),[this.chartOptions.series[0].data[this.chartOptions.series[0].data.length-1][0]+1,Math.floor(Math.random()*150)]]
  //   },
  // ];

  // }

  getdt(){
    return JSON.stringify(this.chartOptions.series);
  }

}
