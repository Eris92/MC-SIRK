#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("../..",import.meta.url))),repo=mkdtempSync(join(tmpdir(),"mc-sirk-ai-"));
const locator=join(root,"scripts/ai/code-locate.mjs"),quiet=join(root,"scripts/ai/quiet-run.mjs"),hook=join(root,".claude/hooks/ContextHook.mjs");
function run(file,args,options={}){return spawnSync(process.execPath,[file,...args],{cwd:root,encoding:"utf8",timeout:12000,...options});}
function git(...args){let r=spawnSync("git",["-C",repo,...args],{encoding:"utf8"});assert.equal(r.status,0,r.stderr);}
function hookEvent(e){const r=run(hook,[],{input:JSON.stringify(e)});assert.equal(r.status,0,r.stderr);return r.stdout.trim()?JSON.parse(r.stdout):null;}
try{
 mkdirSync(join(repo,"server"));writeFileSync(join(repo,"server","runtime.js"),"const owner='ok';\nfunction FirstThing(){}\nfunction FirstThing(){}\n");writeFileSync(join(repo,".env"),"secret=1\n");
 git("init","-q");git("config","user.email","test@example.invalid");git("config","user.name","Test");
 git("add",".");git("commit","-qm","fixture");
 const located=run(locator,["--repo",repo,"--scope","server","--text","FirstThing","--max","1"]);
 assert.equal(located.status,0,located.stderr);
 const result=JSON.parse(located.stdout);assert.equal(result.matches.length,1);assert.equal(result.truncated,true);
 assert.equal(result.matches[0].line,2);assert.equal(located.stdout.includes("function FirstThing"),false);
 const read=run(locator,["--repo",repo,"--read","server/runtime.js","--from","2","--lines","1"]);
 assert.equal(read.status,0,read.stderr);assert.deepEqual(JSON.parse(read.stdout).lines.map(x=>x.line),[2]);
 assert.equal(run(locator,["--repo",repo,"--scope",".","--text","FirstThing"]).status,2);
 assert.equal(run(locator,["--repo",repo,"--read",".env"]).status,3);
 const h=hookEvent({hook_event_name:"UserPromptSubmit",prompt:"Find the login code"});
 assert.match(h.hookSpecificOutput.additionalContext,/layer/);
 const large=join(repo,"server","large.js");writeFileSync(large,"x".repeat(17000));
 const deny=hookEvent({hook_event_name:"PreToolUse",tool_name:"Read",tool_input:{file_path:large}});
 assert.equal(deny.hookSpecificOutput.permissionDecision,"deny");
 const allow=hookEvent({hook_event_name:"PreToolUse",tool_name:"Read",tool_input:{file_path:large,offset:1,limit:40}});
 assert.equal(allow,null);
 const output=Array.from({length:200},(_,i)=>"2026-11-03T12:00:00."+String(i).padStart(3,"0")+"Z sync ok").join("\n");
 const compact=hookEvent({hook_event_name:"PostToolUse",tool_name:"Bash",tool_response:{stdout:output,stderr:"",exit_code:0,interrupted:false,isImage:false}});
 assert.ok(compact?.hookSpecificOutput?.updatedToolOutput?.stdout.includes("[x200]"));
 const failedHook=hookEvent({hook_event_name:"PostToolUse",tool_name:"Bash",tool_response:{stdout:output,stderr:"fatal",exit_code:7}});
 assert.equal(failedHook,null);
 const bad=run(quiet,["--",process.execPath,"-e","for(let i=0;i<80;i++)console.error('2026-11-03T12:00:00.'+String(i).padStart(3,'0')+'Z error test failed');process.exit(7)"]);
 assert.equal(bad.status,7,bad.stderr);assert.match(bad.stderr,/\[x80\]/);assert.match(bad.stderr,/Raw logs:/);
 const ok=run(quiet,["--",process.execPath,"-e","console.log('verbose success')"]);
 assert.equal(ok.status,0,ok.stderr);assert.equal(ok.stdout.includes("verbose success"),false);
 console.log("AI efficiency checks passed (bounded source, hooks, duplicate errors, exit codes).");
}finally{rmSync(repo,{recursive:true,force:true});}
