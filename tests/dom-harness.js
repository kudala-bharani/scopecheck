import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as core from '../dist/core.js';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
export function setup(){
 const dom=new JSDOM(html,{url:'https://scopecheck.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,timers=new Map(),workers=[],copies=[],downloads=[];let nextTimer=0;
 w.structuredClone=structuredClone;
 w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.setTimeout=(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;};
 w.clearTimeout=id=>timers.delete(id);
 w.Worker=class {
  constructor(url,options){this.url=String(url);this.options=options;this.sent=[];this.terminated=false;workers.push(this);}
  postMessage(message){this.sent.push(structuredClone(message));}
  terminate(){this.terminated=true;}
  emit(data){this.onmessage?.({data});}
  error(){this.onerror?.(new Error('mock worker failure'));}
 };
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>copies.push(text)}});
 w.Blob=class{constructor(parts,options){this.parts=parts;this.options=options;}};
 w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:https://scopecheck.test/test';};
 w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){if(this.download)Object.assign(downloads.at(-1),{filename:this.download,url:this.href});};
 w.__core=core;
 let source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 source=source.replace(/^import[^\n]+\n/,`const {SAMPLE,LABELS,escapeHTML:esc,lines,validateInput,manualResult,money,estimate,makeBrief,makeResponse}=window.__core;\n`).replaceAll('import.meta.url',JSON.stringify('https://scopecheck.test/app.js'));
 w.eval(source);
 const $=s=>w.document.querySelector(s);
 const click=s=>$(s).click();
 const field=(selector,value,type='change')=>{const el=$(selector);el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
 const edit=(values={})=>{click('#edit-project');for(const [id,value] of Object.entries(values))$('#'+id).value=value;$('#editor-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 const start=()=>{click('#analyze');if($('#download-dialog').open)click('#confirm-download');return workers.at(-1);};
 const result=(label='covered')=>({label,reason:'Mock result',evidence:[0],scores:core.SAMPLE.scope.map(()=>({entailment:.99,contradiction:.001,neutral:.009})),flags:[],source:'model'});
 const complete=(worker,label='covered',runId=worker.sent.at(-1).runId)=>worker.emit({type:'complete',runId,results:worker.sent.at(-1).requests.map(()=>result(label))});
 return {dom,w,$,click,field,edit,start,result,complete,workers,copies,downloads,timers,close:()=>dom.window.close()};
}
