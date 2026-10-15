import * as ort from 'onnxruntime-web/wasm';
import { env, AutoTokenizer } from '@huggingface/transformers';
import fs from 'node:fs';
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
env.allowRemoteModels=false;env.localModelPath=process.cwd()+'/models/';env.useFSCache=false;
const tokenizer=await AutoTokenizer.from_pretrained('Xenova/nli-deberta-v3-xsmall');
const start=performance.now();
const session=await ort.InferenceSession.create(fs.readFileSync('models/Xenova/nli-deberta-v3-xsmall/onnx/model_quantized.onnx'),{executionProviders:['wasm']});
console.log('WASM LOADED',performance.now()-start,session.inputNames,session.outputNames);
const rows=[];
for(const c of JSON.parse(fs.readFileSync('cases.json','utf8'))){
 const inputs=tokenizer(c.p,{text_pair:c.h,truncation:false,padding:false});const tokens=inputs.input_ids.dims.at(-1); if(tokens>512)throw Error('Too long');
 const feeds=Object.fromEntries(session.inputNames.map(name=>[name,new ort.Tensor(inputs[name].type,inputs[name].data,inputs[name].dims)]));
 const t=performance.now();const output=await session.run(feeds);const logits=Array.from(output.logits.data);const max=Math.max(...logits),exps=logits.map(v=>Math.exp(v-max)),sum=exps.reduce((a,b)=>a+b,0),probs=exps.map(v=>v/sum);
 const row={...c,tokens,ms:performance.now()-t,logits,probabilities:probs,prediction:['contradiction','entailment','neutral'][probs.indexOf(Math.max(...probs))]};rows.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync('wasm-results.json',JSON.stringify({runtime:'onnxruntime-web WASM in Node, one thread',rows},null,2));await session.release();
