#!/usr/bin/env node
// Read-only, bounded lookup over this checkout's tracked source.
import { spawnSync } from "node:child_process";
import { createReadStream, realpathSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
let root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),"../.."));
const options={};
for(let i=2;i<process.argv.length;i+=2){
  const key=process.argv[i], val=process.argv[i+1];
  if(!["--repo","--scope","--text","--read","--from","--lines","--max"].includes(key)||val===undefined){
    console.error("Usage: --scope path --text literal [--max N] OR --read path [--from N --lines N]");process.exit(2);
  }
  options[key.slice(2)]=val;
}
if(options.repo)root=realpathSync(resolve(options.repo));
function report(v,code=0){console.log(JSON.stringify(v));process.exitCode=code;}
function safePath(value){
  if(!value||isAbsolute(value)||value==="."||value===".."||value.split(/[\\/]/).includes(".."))throw Error("Choose one relative file or module directory, not repository root.");
  const full=realpathSync(resolve(root,value));
  if(full!==root&&!full.startsWith(root+sep))throw Error("Path escapes repository");
  const path=relative(root,full).split(sep).join("/");
  if(/(^|\/)(?:\.git|\.env(?:\..*)?|id_rsa|id_ed25519|.*\.(?:pfx|pem|key))($|\/)/i.test(path))throw Error("Sensitive path blocked");
  return {full,path};
}
const rev=spawnSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8"});
if(rev.status!==0)report({status:"error",message:"Git checkout required"},4);
else if(options.read){
  try{
    const p=safePath(options.read),start=options.from===undefined?1:Number(options.from),count=options.lines===undefined?35:Number(options.lines);
    if(!Number.isInteger(start)||start<1||!Number.isInteger(count)||count<1||count>80)throw Error("from>=1 and lines=1..80 required");
    if(!statSync(p.full).isFile())throw Error("Not a file");
    const tracked=spawnSync("git",["-C",root,"ls-files","--error-unmatch","--",p.path],{encoding:"utf8"});
    if(tracked.status!==0)throw Error("File is not tracked");
    const reader=createInterface({input:createReadStream(p.full,{encoding:"utf8"}),crlfDelay:Infinity});
    const lines=[];let number=0,shortened=0;
    for await(const line of reader){number++;if(number<start)continue;if(number>=start+count)break;if(line.length>400)shortened++;lines.push({line:number,text:line.slice(0,400)});}
    reader.close();
    report({status:"ok",revision:rev.stdout.trim(),path:p.path,lines,shortened});
  }catch(e){report({status:"error",message:e.message},3);}
}else{
  try{
    if(!options.scope||typeof options.text!=="string"||!options.text.trim())throw Error("scope and text required");
    const scope=safePath(options.scope),max=options.max===undefined?20:Number(options.max);
    if(!Number.isInteger(max)||max<1||max>50)throw Error("max=1..50 required");
    const g=spawnSync("git",["-C",root,"-c","core.quotePath=false","grep","-n","-I","-F","-e",options.text,"--",scope.path],{encoding:"utf8",maxBuffer:2*1024*1024});
    if(g.error)throw Error("Git search exceeded bounded output or failed");
    if(![0,1].includes(g.status))throw Error("Git grep failed");
    const rows=g.stdout.split(/\r?\n/).filter(Boolean);
    const matches=rows.slice(0,max).map(s=>{const m=/^(.+?):([0-9]+):/.exec(s);return m?{path:m[1],line:Number(m[2])}:null;}).filter(Boolean);
    report({status:matches.length?"found":"no-match",revision:rev.stdout.trim(),scope:scope.path,count:matches.length,truncated:rows.length>max,matches},matches.length?0:3);
  }catch(e){report({status:"error",message:e.message},2);}
}
