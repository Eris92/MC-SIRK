#!/usr/bin/env node
// Run one exact argv command; keep raw logs, display distinct failures only.
import {spawn} from "node:child_process";
import {createWriteStream,mkdirSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {StringDecoder} from "node:string_decoder";
const pos=process.argv.indexOf("--"),args=pos<0?[]:process.argv.slice(pos+1);
if(args.length===0){console.error("Usage: node scripts/ai/quiet-run.mjs -- <command> [args]");process.exit(2);}
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../.."),dir=join(root,".codex-local","ai-logs");
mkdirSync(dir,{recursive:true,mode:0o700});
const id=new Date().toISOString().replace(/[:.]/g,"-")+"-"+randomUUID().slice(0,8);
const paths=[join(dir,id+".stdout.log"),join(dir,id+".stderr.log")];
const outputs=paths.map(p=>createWriteStream(p,{flags:"wx",mode:0o600}));
const decoders=[new StringDecoder("utf8"),new StringDecoder("utf8")];
const rest=["",""],tail=[],errors=new Map();
const isError=/\b(error|exception|failed|failure|fatal|timeout|timed out|traceback|panic)\b|:\s*error\s+\w+\d+/i;
let overflow=false,spawnError=null;
function observe(line){
 if(!line.trim())return;
 tail.push(line);if(tail.length>20)tail.shift();
 if(!isError.test(line)||/\b(?:0\s+(?:errors|failures|failed)|no\s+errors)\b/i.test(line))return;
 const key=line.trim().replace(/\b20\d{2}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?\b/g,"<timestamp>").replace(/(?<!\d)\d\d:\d\d:\d\d(?:\.\d+)?(?!\d)/g,"<time>");
 if(!errors.has(key)&&errors.size>=500){overflow=true;return;}
 errors.set(key,(errors.get(key)||0)+1);
}
function feed(chunk,i){
 const lines=(rest[i]+decoders[i].write(chunk)).split(/\r?\n/);
 rest[i]=lines.pop()||"";for(const s of lines)observe(s);
}
const child=spawn(args[0],args.slice(1),{cwd:process.cwd(),stdio:["inherit","pipe","pipe"],shell:false,windowsHide:true});
for(const i of [0,1])child.stdio[i+1].on("data",b=>{outputs[i].write(b);feed(b,i);});
child.on("error",e=>{spawnError=e;});
child.on("close",(code,signal)=>{
 for(const i of [0,1]){const last=rest[i]+decoders[i].end();if(last)observe(last);outputs[i].end();}
 const exit=spawnError?127:Number.isInteger(code)?code:signal?128:1;
 if(exit===0){console.log("PASS "+args[0]+"; raw logs: "+paths.join(", "));return;}
 console.error("FAIL "+args[0]+" exit="+exit+(signal?" signal="+signal:""));
 if(spawnError)console.error("Start error: "+spawnError.message);
 const rows=errors.size?[...errors.entries()]:tail.map(s=>[s,1]);
 for(const [line,count] of rows.slice(0,50))console.error("[x"+count+"] "+line.slice(0,500));
 if(overflow||rows.length>50)console.error("Additional distinct errors in raw logs");
 console.error("Raw logs: "+paths.join(", "));
 process.exitCode=exit;
});
process.on("SIGINT",()=>child.kill("SIGINT"));
process.on("SIGTERM",()=>child.kill("SIGTERM"));
