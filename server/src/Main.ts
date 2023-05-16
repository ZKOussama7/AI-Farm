let read = require("read");
import * as MDB from "mongodb";
import express from "express";
import cors from "cors";
import * as afs from "fs/promises";
import * as fs from "fs";
import {spawn} from 'child_process'

import * as path from "path";

const client_path =__dirname + 
"..\\..\\..\\client\\dist\\client\\";
const params_path = __dirname + "\\..\\ToBeIgnored\\creds.json";
const files_path = __dirname + "\\..\\Files\\";
const python_path = "python.exe";
const AI_path = __dirname + "..\\..\\..\\AIs\\HP-AI1\\python.py";


let DB_vars = {
usr: "",
pwd: "",
hostname: "localhost",
port: "21017",
};

let Server_vars = {
hostname: "0.0.0.0",
port: "80",
};

let db: MDB.MongoClient | undefined = undefined;
let dtdb:MDB.Collection<MDB.BSON.Document> | undefined;
let subprc=spawn(python_path,[AI_path]);


let lastdata:Date=new Date(0);
async function scanf(
prmpt: string = "",
defult: string = "",
silnt: boolean = false
) {
let rtn: string;
try {
  rtn = await read({ prompt: prmpt, silent: silnt });
} catch {
  return defult;
}

if (!rtn) return defult;
else return rtn;
}

function getkeyval(arg: string) {
let stage = 0;
let key: string = "";
let val: string = "";

for (let c of arg) {
  if (stage == 0) {
    if (c != " ") {
      key += c;
      stage++;
    }
  } else if (stage == 1) {
    if (c != "=") {
      key += c;
    } else stage++;
  } else if (stage == 2) {
    val += c;
  }
}

if (stage == 0 || key == "") return undefined;
else if (stage == 1) {
  return { key };
} else {
  return { key, val };
}
}

async function load_params() {
let edt: any = "";
try {
  edt = await afs.readFile(params_path);
  edt = JSON.parse(edt);
  // console.log(edt);
} catch (ERR) {
  console.log(ERR);
}

DB_vars.usr = edt?.DB?.usr ?? DB_vars.usr;

DB_vars.pwd = edt?.DB?.pwd ?? DB_vars.pwd;

DB_vars.hostname = edt?.DB?.hostname ?? DB_vars.hostname ?? "";

DB_vars.port =
  isNaN(Number(edt?.DB?.port ?? DB_vars.port)) ||
  Number(edt?.DB?.port ?? DB_vars.port) < 1024 ||
  Number(edt?.DB?.port ?? DB_vars.port) > 65535
    ? DB_vars.port
    : edt?.DB?.port ?? DB_vars.port;

Server_vars.hostname = edt?.Ser?.hostname ?? Server_vars.hostname;

Server_vars.port =
  isNaN(Number(edt?.Ser?.port ?? Server_vars.port)) ||
  Number(edt?.Ser?.port ?? Server_vars.port) < 1 ||
  Number(edt?.Ser?.port ?? Server_vars.port) > 65535
    ? Server_vars.port
    : edt?.Ser?.port ?? Server_vars.port;
}

async function param_init() {
let edt: any = "";
try {
  edt = await afs.readFile(params_path);
  edt = JSON.parse(edt);
} catch {}
for (let id = 0; id < process.argv.length; id++) {
  let arg = process.argv[id] ?? "";
  if (id < 2) continue;
  else {
    let tmpkv = getkeyval(arg);

    if (!tmpkv) continue;

    if (!tmpkv?.val) {
      tmpkv.val =
        getkeyval(process.argv[id + 1] ?? "")?.key ?? "No_More_Values";
      if (
        [
          "-du",
          "--db-username",
          "-dpd",
          "--db-password",
          "-dh",
          "--db-hostname",
          "-dp",
          "--db-port",
          "-h",
          "--hostname",
          "-p",
          "--port",
          "No_More_Values",
        ].includes(tmpkv.val)
      ) {
        tmpkv.val = "";
      }
    }
    let kv = { key: tmpkv.key ?? "", val: tmpkv.val ?? "" };
    //   console.log(kv);

    if (kv.key == "-du" || kv.key == "--db-username") {
      kv.val = edt?.DB?.usr ?? kv.val ?? "";
      if (kv.val != "") DB_vars.usr = kv.val;
      else DB_vars.usr = await scanf(" -- Database Username : ", DB_vars.usr);
    }
    if (kv.key == "-dpd" || kv.key == "--db-password") {
      kv.val = edt?.DB?.pwd ?? kv.val ?? "";
      if (kv.val != "") DB_vars.pwd = kv.val;
      else
        DB_vars.pwd = await scanf(
          " -- Database Password : ",
          DB_vars.pwd,
          true
        );
    }
    if (kv.key == "-dh" || kv.key == "--db-hostname") {
      kv.val = edt?.DB?.hostname ?? kv.val ?? "";
      if (kv.val != "") DB_vars.hostname = kv.val;
      else
        DB_vars.hostname = await scanf(
          " -- Database hostname : ",
          DB_vars.hostname
        );
    }
    if (kv.key == "-dp" || kv.key == "--db-port") {
      kv.val = edt?.DB?.port ?? kv.val ?? "";
      if (kv.val != "")
        DB_vars.port =
          isNaN(Number(kv.val)) ||
          Number(kv.val) < 1024 ||
          Number(kv.val) > 65535
            ? DB_vars.port
            : kv.val;
      else {
        let val = await scanf(
          " -- Database Port (1024 -> 65535) : ",
          DB_vars.port
        );
        DB_vars.port =
          isNaN(Number(val)) || Number(val) < 1024 || Number(val) > 65535
            ? DB_vars.port
            : val;
      }
    }
    if (kv.key == "-h" || kv.key == "--hostname") {
      kv.val = edt?.Ser?.hostname ?? kv.val ?? "";
      if (kv.val != "") Server_vars.hostname = kv.val;
      else
        Server_vars.hostname = await scanf(
          " -- Server Hostname : ",
          Server_vars.hostname
        );
    }
    if (kv.key == "-p" || kv.key == "--port") {
      kv.val = edt?.Ser?.port ?? kv.val ?? "";
      if (kv.val != "")
        Server_vars.port =
          isNaN(Number(kv.val)) ||
          Number(kv.val) < 1 ||
          Number(kv.val) > 65535
            ? Server_vars.port
            : kv.val;
      else {
        let val = await scanf(
          " -- Server Port (1 -> 65535) : ",
          Server_vars.port
        );
        Server_vars.port =
          isNaN(Number(val)) || Number(val) < 1 || Number(val) > 65535
            ? Server_vars.port
            : val;
      }
    }
  }
}
}
let oldest!:number;

function runPythonScript(imagePath:string) {
return new Promise<string>((resolve, reject) => {
  subprc.stdin.write(imagePath+"\n");
  let stdout = '';
  subprc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  subprc.stderr.on('data', (data) => {
    reject(`Python script encountered an error: ${data}`);
  });

  subprc.stdout.on('data', (data) => {
    
      resolve(data.toString('utf-8'));
    
  });
});
}

async function main_init() {
await load_params();
await param_init();

let url =
  "mongodb://" +
  (DB_vars.usr ? DB_vars.usr + ":" + DB_vars.pwd + "@" : "") +
  DB_vars.hostname +
  ":" +
  DB_vars.port +
  "/";
// console.log(url);
let db_opts: MDB.MongoClientOptions = {};
db_opts.family = 4;

db = await MDB.MongoClient.connect(url, db_opts);
dtdb=db?.db("ExpDB").collection("sensor_data");
oldest=((await dtdb.findOne({},{sort:{timestamp:-1}}))?.timestamp).getTime();
lstdiseases=((await db?.db("ExpDB").collection("rapports").findOne({},{sort:{timestamp:-1}}))?.diseases);
// console.log(((await db?.db("ExpDB").collection("rapports").findOne({},{sort:{timestamp:-1}}))?.diseases));
// process.exit(0);
// console.log(files_path+"1682475257367.webp")
// console.log(await runPythonScript(files_path+"1682475257367.webp"));
// console.log(await runPythonScript("C:\Users\ZKO7\Documents\Projects\VSCodium\Servers\NodeJS\AIFarm\AIs\HP-AI1\OData\custom\00ddc106-692e-4c67-b2e8-569c924caf49___Rutg._Bact.S 1228.JPG"));

// subprc.kill();
// process.exit(0);
// console.log(oldest);

// let foundings = await dtdb.aggregate([
//   {
//     $match: {
//       type: "Temp",
//       timestamp:{
//         '$gte':new Date("2023-05-13T09:19:42.000Z"),
//       }
//     }
//   },
//   {
//     $sort: {
//       timestamp: 1
//     }
//   },
//   {
//     $group: {
//       _id: {
//         $trunc: {
//           $divide: [
//             { $toLong: "$timestamp" },
//             1000
//           ]
//         }
//       },
//       value: {
//         $avg: "$value"
//       }
//     }
//   },
//   {
//     $project: {
//       timestamp: {
//         $toDate: {
//           $multiply: [
//             "$_id",
//             1000
//           ]
//         }
//       },
//       value: 1,
//       _id: 0
//     }
//   }
// ]).toArray();



// let foundings = await dtdb.aggregate([
//   {
//     $match: {
//       type: "Temp",
//       timestamp: {
//         $gte:new Date(new Date().getTime()-60*60*1000),
//       }
//     }
//   },
//   {
//     $sort: {
//       timestamp: 1
//     }
//   }
// ]).toArray();
// console.log(foundings[0] );

// process.exit(-1);
// let infodb = db.db("ExpDB").collection("info");
// let docs: any = await infodb.find().toArray();
// console.log(docs);
//docs = await infodb.insertOne({name:"Him",NickName:"The Slave"});
//console.log(docs);
// dtdb.findOne({}, null, { sort: { timestamp: -1} })


// console.log();
// db.close();
// process.stdin.on("data", () => {
  // process.exit(0);
// });
}

async function get_new_img_name(Dt: Date): Promise<string[]> {
if (!fs.existsSync(files_path))
  await afs.mkdir(files_path, { recursive: true });

let sugname = Dt.getTime();
let count = 0;
while (
  fs.existsSync(
    files_path + sugname + (count == 0 ? ".webp" : "" + count + ".webp")
  )
) {
  count++;
}

return [files_path, sugname + (count == 0 ? "" : count.toString()), ".webp"];
}

let lstdiseases:any;
let rapport: {
timestamp: Date | undefined;
files: { filename: string; location: string; timestamp: Date }[];
} = { timestamp: undefined, files: new Array(0) };
let app = express();

async function save_rapport() {
// console.log(rapport);
/*{
  "timestamp": "2023-04-25T21:14:04.787Z",
  "files": [
    {
      "img": "base64_image_data's_filename",
      "location": "//TODO:Location",
      "timestamp": "2023-04-25T21:14:04.787Z"
    }
  ],
  "rapport": [ // TODO: probably gonna become a single string of latex.
    {
      "data_vector": "the name of the data vec described in this entry of the rapport",
      "sub_rapport": "the description of data vecotor as bad good or more detailed description, and expressing as much info as possible about the plant's health and state"
    }
  ],
  "suggestion": [
    {
      "task": "description of the task to do or the action to take",
      "stat": "Started/done/pending/.../"
    }
  ]
}*/
let rpdb = db?.db("ExpDB").collection("rapports");
if (!rpdb) return false;
let allfiles = "";
rapport.files.forEach((val)=>{
  if(allfiles!=""){
    allfiles+="|"
    allfiles+=files_path+ val.filename;
  }else{
    allfiles=files_path+ val.filename;
  }
})
let diseases=await runPythonScript(allfiles);
console.log(diseases);
const query = { timestamp: rapport.timestamp };
const update = {
  $set: {
    timestamp: rapport.timestamp,
    diseases: diseases.split('|'),
    rapport: [
      {
        data_vector: "temp for example",
        sub_rapport:
          "it is slightly higher than what the plant needs in this stage of its growth",
      },
    ],
    suggestions: [
      {
        task: "if available use more ventillation and try not to give water when sun is hottest",
        stat: "pending",
      },
    ],
  },
  $push: { files: { $each: rapport.files } },
};
const options = { upsert: true };
await rpdb.updateOne(query, update, options);

return diseases;
}

async function save_data(dt:string,dtdb:MDB.Collection<MDB.BSON.Document>):Promise<boolean>{
// TS,T,H,L,W,S0,,,S4;
//console.log("started");
let data_obj:{timestamp:Date,type:string,value:number}[] = new Array(0);
let dev_data = dt.split(',');
const id2type_map:(string|undefined)[]=[undefined,
  "Temp",
  "Hum",
  "Light",
  "Wind",
  "Soil1",
  "Soil2",
  "Soil3",
  "Soil4",
];
// id2type_map.set(9,"Soil5");
// id2type_map.set(10,"Soil6");
// id2type_map.set(11,"Soil7");
// id2type_map.set(12,"Soil8");
if(isNaN(Number(dev_data[0])))
  return false;

let ttimestamp=new Date(Number(dev_data[0]));

for(let i=1;i<dev_data.length;i++){
  let ttype=id2type_map[i];
  if (ttype===undefined)
  return false;
  
  let tval=Number(dev_data[i]);
  if(isNaN(tval))
  return false;
  
  data_obj.push({timestamp:ttimestamp,type:ttype,value:tval});
}

if (!dtdb) return false;
for(let sendb of data_obj){
  const query = { timestamp: sendb.timestamp,type:sendb.type };
  const update = {
    $set: {
      timestamp: sendb.timestamp,
      type:sendb.type,
      value:sendb.value,
    }
  };
  const options = { upsert: true };
  try{
    await dtdb.updateOne(query, update, options);
  }catch (e){
    return false;
  }
}

return true;
}

app.use(
express.json({ limit: "50mb", type: ["application/json", "text/plain"]})
);
app.use(express.text({ limit: "50mb", type: ["text/data"] }));
//monitoring the requests' bodies;
app.use(function (req, res, next) {
  console.log("// ",
    req.method.toUpperCase(),
    ":",
    (req.headers?.origin??req.hostname) + req.url,
    ":",
    req.body,
    ";"
  );
  next();
});
// app.use(express.urlencoded());


//for checking on the server ( like a ping of some sort)
app.post("/ping", (req, res) => {
if (req.body == "Input") {
  console.log("Got Pinged ...");
  res.status(200).send("Output");
  return true;
}
if (req.body == "Time") {
  console.log("Sent Time");
  // res.status(200).send("123456789");
  res.status(200).send((new Date().getTime()).toString());
  return true;
}
res.sendStatus(500);
return false;
});

//for checking the last diseases
app.post("/diseases", (req, res) => {
res.send(lstdiseases);
});

// webpages
app.get(["/", "/divide", "/monitor", "/404"], (req, res) => {
if (req.url == "/404") res.status(404).sendFile(client_path + "index.html");
else res.sendFile(client_path + "index.html");
});

//TODO: remove 4200   cors
//api for data upload
app.options(
"/api/monitor",
//cors({ origin: "http://localhost:4200" }),
(req, res) => res.sendStatus(200)
);
app.post(  "/api/monitor",
//cors({ origin: "http://localhost:4200" }),
async (req, res) => {
  let rq = req.body;
  // console.log("---------------------------------------------")
  // console.log("req is: ",rq,"req Done;")
  // console.log("---------------------------------------------");
  if (!rq?.type) {
    res.send({ done: false });
    return;
  }
  let cr_time = new Date();
  if (rq.type == "start") {
    // console.log(rapport);
    let chngd = false;
    if (rapport.timestamp === undefined) {
      rapport = { timestamp: cr_time, files: [] };
      chngd = true;
    } else if (
      Math.floor(
        (cr_time.getTime() - rapport.timestamp.getTime()) / (1000 * 60 * 60)
      ) > 24
    ) {
      //TODO: end the first rapport and start another

      chngd = true;
      rapport = { timestamp: cr_time, files: [] };
    }

    res.send({
      timestamp: rapport.timestamp,
      done: true,
      new: chngd,
      count: rapport.files.length,
    });
    return;
  } else if (rq.type == "send") {
    // console.log(rapport);
    // TODO: save image to folder then add filename and timestamp to repport
    if (rapport.timestamp === undefined) {
      res.send({ done: false });
      return;
    }
    if (rq.file.img) {
      let buf = Buffer.from(rq.file.img, "base64");
      let imgnm = await get_new_img_name(new Date(rq.file.timestamp));
      // console.log(imgnm);
      try {
        await afs.writeFile(imgnm.join(""), buf);
      } catch {
        try {
          await afs.rm(imgnm.join(""));
        } catch {}
        res.send({ done: false });
        return;
      }
      if (!imgnm[1] || !imgnm[2]) {
        res.send({ done: false });
        return;
      }
      rapport.files.push({
        filename: imgnm[1] + imgnm[2],
        location: rq.file.location,
        timestamp: rq.file.timestamp,
      });
      res.send({ done: true, file_count: rapport.files.length });
      return;
    }
  } else if (rq.type == "end") {
    // TODO: check if rapport have files, then either save rapport to db, or return done with chngd false
    // TODO: include keywords like "looks like this disease" or "resembles" or " what may be high humidity level" and " we have a closed/open field where we are raising [plant_name]" ,etc... when fetching the suggestions.
    // MAYDO: rapport generating should be independent of the monitoring session, and can include multiple monitoring sessions
    // console.log(rapport);
    if (rapport.timestamp === undefined || rapport.files.length == 0) {
      res.send({ done: false });
      return;
    }


    let diseases=(await save_rapport());
    lstdiseases=diseases;
    if (!true) {//was await rapport save
      res.send({ done: false });
      return;
    }
    rapport = { timestamp: undefined, files: [] };

    res.send({ done: true ,diseases:diseases
    });
    return;
  }
}
);

// api for data gathering from esp32
app.post("/api/send", async (req, res) => {
let rdata:string = req.body;
if ((rdata == "TEST")) {
  // console.log(rdata);
  res.status(200).send("TESTED");
  console.log("Got Tested ...");
  return true;
}

if(rdata.slice(undefined,7)=="Sample:"){
  res.status(200).send("SAMPLED");
  console.log("Got Sampled");
  return true;
}

if(dtdb===undefined)
  dtdb = db?.db("ExpDB").collection("sensor_data");

if(!dtdb){
res.sendStatus(500);
return false;
}

if(rdata.slice(undefined,5)=="File:"){
  //console.log("Filed /////////////////////////////////");
  rdata=rdata.slice(5);
  res.status(200).send("AKNOWLEGED");
  let div_rdata = rdata.split('\n');
  let allgood=true;
  let onegood=false;
  for(let rdata_row of div_rdata){
    if(rdata_row.indexOf(',')<0)
      continue;
    if(!(await save_data(rdata_row,dtdb)))
      allgood=false;
    else
      onegood=true;
  }
  //TODO: coment out the error replies or else the files in esp will jusst increase and  never decrease;
  if(!onegood){
    //res.sendStatus(500);
    return false;
  }
  //res.status(200).send("AKNOWLEGED");
  console.log("Filed ..."+ (allgood?" Good .":" Failed!!!"));
  return;
}

if(!await save_data(rdata,dtdb)){
  res.sendStatus(500);
  return false;
}
res.status(200).send("AKNOWLEGED");
lastdata=new Date();
return true;
});

// api for data request
app.options(
"/api",
//cors({ origin: "http://localhost:4200" }),
(req, res) => res.sendStatus(200)
);
app.post("/api",
//cors({ origin: "http://localhost:4200" }),
async (req, res) => {

  if(dtdb===undefined)
    dtdb = db?.db("ExpDB").collection("sensor_data");

  if(!dtdb){
    res.send({error:"Database Unreachable"});
    return false;
    }
  
  /*
  {
    type:"temp?",
    from:date1,
    to:date2,
  }
  */
  if(req.body===undefined){
    res.send({error:"There No Request Body"});
    return false;
  }

  if(req.body.time!==undefined){
    if(req.body.time=="LAST"){
      let lstime:number=((await dtdb.findOne({},{sort:{timestamp:-1}}))?.timestamp).getTime();
      res.send({time:lstime});
      return true;
    }
  }
  if(req.body.type ===undefined || req.body.from ===undefined || req.body.to===undefined){
    res.send({error:"Proprieties Are Missing"});
    return false;
  }
  
  let items;
  let lstime:number;
  // const query={
  //   timestamp: {
  //     '$gte': new Date(Number(req.body.from)),
  //     '$lte': new Date(Number(req.body.to))
  //   },
  //   type: req.body.type
  // }
  // const options={
  //   type: 0,
  //   // timestamp: 1,
  //   // value: 1,
  //   _id: 0
  // };

  const qfind={
    $match: {
      type: req.body.type,
      timestamp:{
        '$gte': new Date(Number(req.body.from)),
        '$lte': new Date(Number(req.body.to)),
      }
    }
  };

  const qsort={
    $sort: {
      timestamp: -1
    }
  };
  const qavg={
    $group: {
      _id: {
        $trunc: {
          $divide: [
            { $toLong: "$timestamp" },
            1000
          ]
        }
      },
      value: {
        $avg: "$value"
      }
    }
  };
  const qproj={
    $project: {
      timestamp: {
        $toDate: {
          $multiply: [
            "$_id",
            1000
          ]
        }
      },
      value: 1,
      _id: 0
    }
  };

  try{
    // items=await dtdb.find(query,{projection:options}).toArray();
    items = await dtdb.aggregate([
      qfind,
      qsort,
      qavg,
      qproj
    ]).toArray();
    if(items.length<200)
      console.log(items,qfind,qsort,qavg,qproj);
    lstime=((await dtdb.findOne({},{sort:{timestamp:-1}}))?.timestamp).getTime();
  }catch (e){
    console.log(e);
    res.send({error:"Some Thing Went Wrong When Trying To Retrieve Data"});
    return false;
  }
  let avg = 0;
  let count=0;
  for(let item of items){
    count++;
    avg=avg-avg/(count)+item.value  /count;
  }
  res.send({data:items,time:lstime,avg:avg});
  return true;  
}
);
// TODO: Watering detection
// TODO: image to desease
// TODO: make rapport
// TODO: make suggestions;

app.use(express.static(client_path));
app.get("/*", (req, res, next) => {
res.redirect("/404");
// res.sendFile(path.resolve('../client/dist/client/index.html'));
});
main_init().then(() => {
app.listen(Number(Server_vars.port), Server_vars.hostname, () => {
  console.log(
    "  ---+++| Server Started and is Listening On http://" +
      Server_vars.hostname +
      ":" +
      Server_vars.port +
      " ... |+++---"
  );
});
});
