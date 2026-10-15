import {assess,inputGuard,softmax,MODEL} from './core.js';
const REVISION='2a4f614a701367a02d51389039afc998faeda637';
let tokenizer,model,activeRun=0;
const send=(type,data={})=>self.postMessage({type,runId:activeRun,...data});
async function load(){
 if(model)return;
 send('progress',{text:'Loading inference runtime…'});
 const {env,AutoTokenizer,AutoModelForSequenceClassification}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
 env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
 env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
 const progress_callback=p=>{if(p.status==='progress')send('progress',{text:`Downloading ${p.file?.includes('onnx')?'model weights':p.file||'assets'}${Number.isFinite(p.progress)?' · '+Math.round(p.progress)+'%':''}`,percent:p.progress});else if(p.status==='initiate')send('progress',{text:'Preparing '+(p.file||'model files')+'…'});};
 tokenizer=await AutoTokenizer.from_pretrained(MODEL.id,{revision:REVISION,progress_callback});
 model=await AutoModelForSequenceClassification.from_pretrained(MODEL.id,{revision:REVISION,dtype:'q8',device:'wasm',progress_callback});
 const labels=model.config.id2label;
 if(labels?.['0']!=='contradiction'||labels?.['1']!=='entailment'||labels?.['2']!=='neutral')throw new Error('Unexpected model label mapping. Analysis was stopped.');
}
self.onmessage=async ({data})=>{
 if(data.type!=='analyze')return;activeRun=data.runId;
 try{
  if(data.scope.some(s=>/\b(ignore (all |previous |prior )?instructions|system prompt|classify (this|everything)|output (only|covered)|pretend|<\/?system>)/i.test(s)))throw new Error('Instruction-like wording in the agreed scope requires manual review. Remove it or explain the actual deliverables.');
  await load();send('ready');const results=[];let finished=0;const total=data.scope.length*data.requests.length;
  for(const request of data.requests){
   const guard=inputGuard(request);
   if(guard){results.push({label:'clarify',reason:guard,evidence:[],scores:[],flags:[],source:'rule'});finished+=data.scope.length;continue;}
   const inputs=data.scope.map(premise=>tokenizer(premise,{text_pair:request,truncation:false,padding:false}));
   const tooLong=inputs.findIndex(i=>i.input_ids.dims.at(-1)>MODEL.maxTokens);
   if(tooLong>=0){results.push({label:'clarify',reason:`Pair with scope S${String(tooLong+1).padStart(2,'0')} exceeds the 512-token model limit. This request was not analyzed; no text was silently truncated. Split long items while preserving all conditions.`,evidence:[tooLong],scores:[],flags:[],source:'rule'});finished+=data.scope.length;continue;}
   const scores=[];
   for(const input of inputs){const {logits}=await model(input);const [contradiction,entailment,neutral]=softmax(Array.from(logits.data));scores.push({contradiction,entailment,neutral});finished++;send('progress',{percent:100*finished/total,text:`Comparing text pairs · ${finished}/${total}`});}
   results.push(assess(data.scope,request,scores));
  }
  send('complete',{results});
 }catch(error){send('error',{message:error?.message||'Local inference failed. Please retry or review manually.'});}
};
