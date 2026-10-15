import { env, AutoTokenizer, AutoModelForSequenceClassification } from '@huggingface/transformers';
import fs from 'node:fs';
env.allowRemoteModels=false;env.localModelPath=process.cwd()+'/models/';env.useFSCache=false;
const modelId='Xenova/nli-deberta-v3-xsmall';
const t=performance.now();
const tokenizer=await AutoTokenizer.from_pretrained(modelId);
const model=await AutoModelForSequenceClassification.from_pretrained(modelId,{device:'cpu',dtype:'q8'});
console.log('LOADED',performance.now()-t,model.config.id2label);
const rows=[];
for(const c of JSON.parse(fs.readFileSync('cases.json','utf8'))){
 const input=tokenizer(c.p,{text_pair:c.h,truncation:false,padding:false}); const length=input.input_ids.dims.at(-1);if(length>512)throw Error('over length');
 const start=performance.now(); const {logits}=await model(input);const values=Array.from(logits.data);const max=Math.max(...values),exps=values.map(v=>Math.exp(v-max)),sum=exps.reduce((a,b)=>a+b,0),probs=exps.map(v=>v/sum);
 const row={...c,tokens:length,ms:performance.now()-start,logits:values,probabilities:probs,prediction:model.config.id2label[probs.indexOf(Math.max(...probs))]}; rows.push(row);console.log(JSON.stringify(row));
}
const long=tokenizer('The freelancer will build a homepage. '.repeat(100)+'Copywriting is excluded.',{text_pair:'The freelancer will write the page copy.',truncation:false,padding:false});
console.log('LONG-GUARD',long.input_ids.dims.at(-1));
fs.writeFileSync('node-results.json',JSON.stringify({runtime:'onnxruntime-node cpu q8',rows},null,2));await model.dispose();
