#!/usr/bin/env node
// Claude/Codex prompt routing and safe bounded-read hook. Fail open on parser errors.
import {realpathSync,statSync} from "node:fs";
import {isAbsolute,resolve} from "node:path";
let payload="";
for await(const b of process.stdin){payload+=b;if(payload.length>500000)process.exit(0);}
try{
 if(!payload.trim())process.exit(0);
 const e=JSON.parse(payload),kind=e.hook_event_name,tool=e.tool_name;
 const send=v=>process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:kind,...v}}));
 if(kind==="UserPromptSubmit"){
  const q=String(e.prompt||"");
  if(/[\w./\\-]+\.(?:js|ps1|md|css):\d+/.test(q))process.exit(0);
  send({additionalContext:"First route in docs/INDEX.md to one layer and source symbol. For multi-file discovery use the Haiku code-locator, returning only path:line ranges and direct dependencies. Prefer scripts/ai/code-locate.mjs over full-file dumps. Use quiet-run.mjs for tests; full logs stay local."});
 }else if(kind==="PreToolUse"&&tool==="Read"){
  const name=e.tool_input?.file_path,limit=e.tool_input?.limit,offset=e.tool_input?.offset;
  if(typeof name!=="string")process.exit(0);
  const root=process.env.CLAUDE_PROJECT_DIR||process.cwd();
  const full=realpathSync(isAbsolute(name)?name:resolve(root,name));
  if(statSync(full).size>16384&&(!Number.isInteger(limit)||limit<1||limit>120||(offset!==undefined&&(!Number.isInteger(offset)||offset<0))))
   send({permissionDecision:"deny",permissionDecisionReason:"Use Grep or scripts/ai/code-locate.mjs, then bounded Read(offset, limit<=120). Avoid release-history and full source dumps."});
 }else if(kind==="PreToolUse"&&tool==="Bash"){
  const cmd=String(e.tool_input?.command||"");
  if(/\b(?:cat|Get-Content|type)\b[^\r\n]*(?:docs[\\/]releases|changelog\.md|version-history\.json)/i.test(cmd)&&!/\b(?:head|tail|Select-Object)\b/i.test(cmd))
   send({permissionDecision:"deny",permissionDecisionReason:"Historical release data must be read as a bounded range only."});
 }else if(kind==="PostToolUse"&&tool==="Bash"){
  const r=e.tool_response;
  if(!r||typeof r.stdout!=="string"||r.stdout.length<6000||(r.stderr&&r.stderr.trim())||(r.exit_code&&r.exit_code!==0)||/\b(error|failed|exception|fatal)\b/i.test(r.stdout))process.exit(0);
  const lines=r.stdout.split(/\r?\n/).filter(Boolean);
  if(lines.length<80)process.exit(0);
  const groups=new Map();
  for(const s of lines){
   const x=s.trim().replace(/\b20\d{2}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?\b/g,"<timestamp>");
   groups.set(x,(groups.get(x)||0)+1);
   if(groups.size>40)process.exit(0);
  }
  if(groups.size>=lines.length/3)process.exit(0);
  const linesOut=["Repetitive success output: "+lines.length+" lines, "+groups.size+" signatures."];
  for(const [line,count] of groups)linesOut.push("[x"+count+"] "+line);
  send({updatedToolOutput:{...r,stdout:linesOut.join("\n")+"\n"}});
 }
}catch{process.exit(0);}
