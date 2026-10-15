export const LABELS = {covered:'Likely covered', change:'Possible change', clarify:'Needs clarification'};
export const MODEL = {id:'Xenova/nli-deberta-v3-xsmall', library:'3.8.1', maxTokens:512};
export const SAMPLE = {
  title:'Northstar Studio website', client:'Northstar Studio', rate:85, currency:'USD',
  scope:[
    'Design and build a responsive five-page website: Home, About, Services, Work, and Contact.',
    'Include a contact form that sends submissions by email.',
    'Include up to two rounds of design revisions.',
    'CRM integrations are excluded from this project.',
    'The client supplies all final copy and images.'
  ],
  requests:[
    'Please include an email contact form.',
    'Can we add a HubSpot CRM integration to the contact form?',
    'Let’s make it eight pages instead of five pages.',
    'Could it feel a little more premium?'
  ]
};
export function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function lines(text){return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}
export function validateInput(scope,requests){
  if(!scope.length||!requests.length)return 'Add at least one scope item and one request.';
  if(scope.length>20||requests.length>12)return 'Use at most 20 scope items and 12 requests per review. Split larger projects into separate reviews.';
  if([...scope,...requests].some(s=>s.length>2500))return 'An item is longer than 2,500 characters. Split it into complete, self-contained clauses without dropping conditions or exclusions.';
  return null;
}
export function softmax(logits){const max=Math.max(...logits);const e=logits.map(x=>Math.exp(x-max));const sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
export function inputGuard(text){
  if(/\b(ignore (all |previous |prior )?instructions|system prompt|classify (this|everything)|output (only|covered)|pretend|<\/?system>)/i.test(text))return 'Instruction-like wording detected. Review this request manually; model scoring is skipped.';
  if(/\b(more premium|better|nicer|as needed|and so on|etc\.?|make it pop|whatever it takes|another revision|one more round|another round|extra revision|additional revision)\b/i.test(text))return 'This request needs a concrete deliverable or acceptance criteria.';
  if(/\b(and|also)\s+(add|build|integrate|create|write|translate)\b/i.test(text))return 'This may combine several deliverables. Split it into separate requests before deciding.';
  return null;
}
const nums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
function quantities(text){const out=[];const regex=/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)[ -]+(pages?|concepts?|screens?|languages?)\b/gi;for(const m of text.matchAll(regex)){out.push({value:nums[m[1].toLowerCase()]??Number(m[1]),unit:m[2].toLowerCase().replace(/s$/,''),quote:m[0]});}return out;}
export function quantityFlags(scope,request){
  if(/\b(not|no|never|without|don[’']t|do not)\b/i.test(request))return [];
  const req=quantities(request);const flags=[];
  scope.forEach((s,i)=>{for(const a of quantities(s)){for(const b of req){if(a.unit===b.unit&&b.value>a.value)flags.push({index:i,reason:`Quantity check: “${b.quote}” in this request exceeds “${a.quote}” in scope. Confirm both refer to the same deliverable.`});}}});
  return flags;
}
export function assess(scope,request,scores){
  const guard=inputGuard(request);
  const flags=quantityFlags(scope,request);
  const sorted=scores.map((s,i)=>({...s,index:i})).sort((a,b)=>Math.max(b.entailment,b.contradiction)-Math.max(a.entailment,a.contradiction));
  const best=scores.map((s,i)=>({...s,index:i})).sort((a,b)=>b.entailment-a.entailment)[0];
  const conflicts=scores.map((s,i)=>({...s,index:i})).filter(s=>s.contradiction>=.86&&/\b(no|not|exclude[ds]?|only|without|rather than|client will|client supplies)\b/i.test(scope[s.index]));
  const conditions=scope.some(s=>/\b(if|unless|subject to|provided|before|after|dependent|contingent)\b/i.test(s));
  let label='clarify',reason='No strong, unambiguous match was established. Missing support is not proof that work is outside scope.';
  if(guard)reason=guard;
  else if(flags.length){label='change';reason=flags[0].reason;}
  else if(conflicts.length){label='change';reason='The model found a possible conflict with explicit scope wording. Review the original text together before deciding.';}
  else if(best?.entailment>=.92&&best.contradiction<.05&&!conditions&&!scores.some(s=>s.contradiction>.3)&&!/\b(up to|only|except)\b/i.test(scope[best.index])){label='covered';reason='The model found strong textual support. Verify the deliverable and all surrounding scope before relying on this suggestion.';}
  else if(conditions){reason='The agreed scope includes conditions or dependencies. Confirm that they are met before deciding whether this request is covered.';}
  else if(best?.entailment>=.65){reason='Some wording looks related, but the model did not establish sufficiently strong support. Confirm details and conditions.';}
  const evidence=[...new Set([...flags.map(f=>f.index),...conflicts.map(f=>f.index),...sorted.slice(0,2).map(s=>s.index)])];
  return {label,reason,evidence,scores,flags,guard,source:'model'};
}
export function manualResult(){return {label:'clarify',reason:'No AI analysis yet. You can review the source and make your own decision.',evidence:[],scores:[],flags:[],source:'manual'};}
export function money(value,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(value);}
export function estimate(records,rate){return records.reduce((sum,r)=>sum+((r.override||r.result?.label)==='change'&&Number.isFinite(r.hours)&&r.hours>=0?r.hours*rate:0),0);}
export function makeBrief(project,records){
 const out=[`SCOPECHECK · REVIEW BRIEF`,project.title||'Untitled project',`Client: ${project.client||'Not specified'}`,'', 'Working review, not a contract amendment. Labels are suggestions or human decisions. Nothing is sent automatically.','', 'AGREED SCOPE',...project.scope.map((s,i)=>`S${String(i+1).padStart(2,'0')}: ${s}`),'','REQUEST REVIEW'];
 records.forEach((r,i)=>{
  const label=r.override||r.result?.label||'clarify';
  out.push('',`${i+1}. ${r.text}`,`Review: ${LABELS[label]}${r.override?' (your decision)':''}`,`Method: ${r.result?.source==='model'?'Local NLI model + separate deterministic checks':'Manual review; no AI analysis'}`);
  if(r.result?.reason)out.push(`Review note: ${r.result.reason}`);
  for(const idx of r.result?.evidence||[])out.push(`Related scope S${String(idx+1).padStart(2,'0')}: “${project.scope[idx]}”`);
  if(r.notes.trim())out.push(`Your note: ${r.notes.trim()}`);
  if(label==='change')out.push(r.hours===null?'Estimate: not supplied':`Your estimate: ${r.hours} h × ${money(project.rate,project.currency)} = ${money(r.hours*project.rate,project.currency)}`);
 });
 out.push('',`Draft estimated changes: ${money(estimate(records,project.rate),project.currency)}${records.some(r=>(r.override||r.result?.label)==='change'&&r.hours===null)?' (incomplete; some hours not supplied)':''}`, 'Estimates are entered by you, exclude taxes, and require mutual approval. No payment obligation or schedule promise is created.');
 return out.join('\n');
}
export function makeResponse(project,records){
 const parts=[`Hi${project.client?' '+project.client:''},`,'',`Thanks for the requests for ${project.title||'the project'}. Here is my proposed review for us to confirm:`];
 records.forEach((r,i)=>{const label=r.override||r.result?.label||'clarify';parts.push('',`${i+1}. “${r.text}”`);if(label==='covered')parts.push('This looks consistent with the agreed scope. Let’s confirm the details before proceeding.');else if(label==='change')parts.push('This may change the agreed deliverables. Could we confirm the scope and any timing impact before proceeding?'+(r.hours!==null?` My draft estimate is ${r.hours} hours (${money(r.hours*project.rate,project.currency)}, excluding taxes), subject to your approval.`:''));else parts.push('Could you clarify the exact deliverable and what success would look like? I would like to confirm how it fits the agreed scope.');if(r.notes.trim())parts.push(`Review note: ${r.notes.trim()}`);});
 parts.push('','Please let me know what you would like to clarify or adjust. We can confirm any changes together before work begins.');return parts.join('\n');
}
