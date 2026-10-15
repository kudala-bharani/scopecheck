import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as flush} from 'node:timers/promises';
import {setup} from './dom-harness.js';
const run=(name,fn)=>test(name,async()=>{const h=setup();try{await fn(h);}finally{await flush();h.close();}});

run('initial workspace is manual, with no worker or download before consent',h=>{
 assert.equal(h.workers.length,0);assert.equal(h.$('#total-estimate').textContent,'$0.00');
 assert.equal(h.w.document.querySelectorAll('.badge.clarify').length,4);
 h.click('#analyze');assert.equal(h.$('#download-dialog').open,true);assert.equal(h.workers.length,0);
 h.click('#download-dialog .dialog-close');assert.equal(h.workers.length,0);
});

run('manual override, estimated hours, filter and exported brief stay consistent',h=>{
 h.click('[data-id="1"] [data-action="toggle"]');h.field('[data-id="1"] [data-field="override"]','change');
 h.field('[data-id="1"] [data-field="hours"]','2.5');h.field('[data-id="1"] [data-field="notes"]','Confirm CRM access.');
 assert.equal(h.$('#total-estimate').textContent,'$212.50');assert.equal(h.$('#changes-count').textContent,'1');
 assert.match(h.$('#brief-output').textContent,/Confirm CRM access\./);
 h.click('[data-filter="change"]');assert.equal(h.w.document.querySelectorAll('.request-card').length,1);
 h.field('[data-id="1"] [data-field="override"]','covered');assert.equal(h.$('#total-estimate').textContent,'$0.00');
});

run('invalid hours cannot enter the estimate and empty hours remain incomplete',h=>{
 h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-id="0"] [data-field="override"]','change');
 h.field('[data-id="0"] [data-field="hours"]','-1');assert.equal(h.$('#total-estimate').textContent,'$0.00');
 assert.match(h.$('#estimate-caption').textContent,/Incomplete/);
 h.field('[data-id="0"] [data-field="hours"]','3');assert.equal(h.$('#total-estimate').textContent,'$255.00');
 h.field('[data-id="0"] [data-field="hours"]','');assert.equal(h.$('#total-estimate').textContent,'$0.00');
});

run('changing scope resets decisions, hours and notes while title/rate edits preserve them',h=>{
 h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-id="0"] [data-field="override"]','change');h.field('[data-id="0"] [data-field="hours"]','2');h.field('[data-id="0"] [data-field="notes"]','Old note');
 h.edit({'project-name':'Retitled','rate-input':'100'});assert.equal(h.$('#total-estimate').textContent,'$200.00');assert.match(h.$('#brief-output').textContent,/Old note/);
 h.edit({'scope-input':'Build one page.'});assert.equal(h.$('#total-estimate').textContent,'$0.00');assert.equal(h.$('#changes-count').textContent,'0');assert.doesNotMatch(h.$('#brief-output').textContent,/Old note/);assert.match(h.$('#live-status').textContent,/cleared/);
});

run('request edit resets old analysis and rejects empty or excessive projects',h=>{
 const worker=h.start();h.complete(worker);h.edit({'requests-input':'One new request.'});assert.equal(h.$('#all-count').textContent,'1');assert.equal(h.$('.badge').textContent,'Needs clarification');
 h.edit({'scope-input':''});assert.equal(h.$('#editor-dialog').open,true);assert.match(h.$('#editor-error').textContent,/at least/);
 h.edit({'requests-input':Array(13).fill('Request').join('\n')});assert.match(h.$('#editor-error').textContent,/12 requests/);
});

run('user text renders as text, never executable markup in titles, scope, requests or notes',h=>{
 const payload='<img src=x onerror="window.pwned=1">&\'"';
 h.edit({'project-name':payload,'client-name':payload,'scope-input':payload,'requests-input':payload});
 assert.equal(h.$('#project-title').textContent,payload);assert.equal(h.$('.request-card h3').textContent,payload);assert.ok(h.$('#scope-list').textContent.includes(payload));assert.equal(h.w.document.querySelectorAll('img').length,0);assert.equal(h.w.pwned,undefined);
 h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-field="notes"]','</textarea><script>window.pwned=1</script>');
 h.click('[data-id="0"] [data-action="toggle"]');h.click('[data-id="0"] [data-action="toggle"]');assert.equal(h.w.document.querySelectorAll('#request-list script').length,0);assert.equal(h.w.pwned,undefined);
});

run('cancel terminates worker, preserves manual review and ignores queued completion',h=>{
 h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-id="0"] [data-field="override"]','change');h.field('[data-id="0"] [data-field="hours"]','2');
 const worker=h.start();const id=worker.sent[0].runId;h.click('#cancel-run');assert.equal(worker.terminated,true);assert.equal(h.$('#analyze').hidden,false);
 h.complete(worker,'covered',id);assert.equal(h.$('#total-estimate').textContent,'$170.00');assert.match(h.$('#live-status').textContent,/canceled/);assert.equal(h.$('[data-id="1"] .badge').textContent,'Needs clarification');
});

run('retry uses a fresh worker and ignores stale old-run progress and completion',h=>{
 const first=h.start();h.click('#cancel-run');const second=h.start();assert.notEqual(first,second);
 first.emit({type:'progress',runId:first.sent[0].runId,text:'STALE'});h.complete(first,'change');assert.notEqual(h.$('#progress-label').textContent,'STALE');assert.equal(h.$('#cancel-run').hidden,false);
 h.complete(second);assert.equal(h.$('#cancel-run').hidden,true);assert.equal(h.$('[data-id="1"] .badge').textContent,'Likely covered');
});

run('editing scope during analysis cancels run and rejects old results',h=>{
 const worker=h.start();h.edit({'scope-input':'Design only. No implementation.'});assert.equal(worker.terminated,true);h.complete(worker,'covered');assert.equal(h.$('.badge').textContent,'Needs clarification');assert.match(h.$('#live-status').textContent,/project changed/);
});

run('model completion preserves existing manual decisions and estimates',h=>{
 h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-id="0"] [data-field="override"]','change');h.field('[data-id="0"] [data-field="hours"]','1.5');const worker=h.start();h.complete(worker);
 assert.equal(h.$('[data-id="0"] .badge').textContent,'Possible change');assert.equal(h.$('#total-estimate').textContent,'$127.50');assert.match(h.$('#live-status').textContent,/preserved/);
});

run('worker error leaves review available and retry succeeds',h=>{
 const worker=h.start();worker.emit({type:'error',runId:worker.sent[0].runId,message:'Network unavailable'});assert.equal(worker.terminated,true);assert.equal(h.$('#analyze').hidden,false);assert.match(h.$('#live-status').textContent,/Network unavailable/);
 const retry=h.start();h.complete(retry);assert.equal(h.$('.badge').textContent,'Likely covered');
});

run('synchronous worker construction failure clears busy state and permits retry',h=>{
 const OriginalWorker=h.w.Worker;
 h.w.Worker=class{constructor(){throw new Error('Worker construction denied');}};
 const errors=[];h.w.addEventListener('error',e=>{errors.push(e.message);e.preventDefault();});
 h.start();
 assert.deepEqual(errors,[]);assert.equal(h.$('#analyze').hidden,false);assert.equal(h.$('#cancel-run').hidden,true);
 assert.match(h.$('#live-status').textContent,/worker could not be created/);assert.equal(h.$('.badge').textContent,'Needs clarification');
 h.w.Worker=OriginalWorker;const retry=h.start();h.complete(retry);assert.equal(h.$('.badge').textContent,'Likely covered');
});

run('failed worker cannot apply a late completion after failure',h=>{
 const worker=h.start();worker.emit({type:'error',runId:worker.sent[0].runId,message:'Failed'});h.complete(worker,'covered');
 assert.equal(h.$('.badge').textContent,'Needs clarification');assert.match(h.$('#live-status').textContent,/Failed/);
});

run('old worker error event cannot abort a new retry',h=>{
 const first=h.start();h.click('#cancel-run');const second=h.start();first.error();assert.equal(second.terminated,false);assert.equal(h.$('#cancel-run').hidden,false);h.complete(second);assert.equal(h.$('.badge').textContent,'Likely covered');
});

run('timeout leaves existing review intact and late completion is rejected',h=>{
 const worker=h.start();const timer=[...h.timers.values()].find(t=>t.delay===240000);assert.ok(timer);timer.fn();assert.equal(worker.terminated,true);assert.match(h.$('#live-status').textContent,/too long/);h.complete(worker);assert.equal(h.$('.badge').textContent,'Needs clarification');
});

run('copy and download export current decisions as local text with safe filename',async h=>{
 h.edit({'project-name':'Project <X> / 2026'});h.click('[data-id="0"] [data-action="toggle"]');h.field('[data-field="override"]','change');h.field('[data-field="hours"]','2');h.click('#copy-brief');await flush();
 assert.equal(h.copies[0],h.$('#brief-output').textContent);h.click('#download-brief');assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].blob.parts.join(''),h.copies[0]);assert.equal(h.downloads[0].filename,'project-x-2026-scope-review.txt');assert.equal(h.downloads[0].blob.options.type,'text/plain;charset=utf-8');
 h.$('#response-output').value='Custom client draft';h.click('#copy-response');await flush();assert.equal(h.copies.at(-1),'Custom client draft');
});

run('clipboard rejection exposes manual fallback without losing export text',async h=>{
 h.w.navigator.clipboard.writeText=async()=>{throw new Error('blocked');};h.click('#copy-brief');await flush();assert.match(h.$('#live-status').textContent,/Clipboard access is unavailable/);assert.match(h.$('#brief-output').textContent,/SCOPECHECK/);
});

run('in-content brief and back buttons switch views without sidebar navigation',h=>{
 h.click('#open-brief');assert.equal(h.$('#brief-view').hidden,false);assert.equal(h.$('#review-view').hidden,true);
 h.click('#back-review');assert.equal(h.$('#brief-view').hidden,true);assert.equal(h.$('#review-view').hidden,false);
});

run('edited response survives view navigation and is copied verbatim',async h=>{
 h.click('#open-brief');h.field('#response-output','My carefully edited client response.','input');
 h.click('#back-review');h.click('[data-id="0"] [data-action="toggle"]');h.click('#open-brief');
 assert.equal(h.$('#response-output').value,'My carefully edited client response.');h.click('#copy-response');await flush();assert.equal(h.copies.at(-1),'My carefully edited client response.');
});

run('review toggle restores focus after re-rendering the card',h=>{
 h.click('[data-id="0"] [data-action="toggle"]');assert.equal(h.w.document.activeElement,h.$('[data-id="0"] [data-action="toggle"]'));assert.equal(h.w.document.activeElement.getAttribute('aria-expanded'),'true');
 h.click('[data-id="0"] [data-action="toggle"]');assert.equal(h.w.document.activeElement,h.$('[data-id="0"] [data-action="toggle"]'));assert.equal(h.w.document.activeElement.getAttribute('aria-expanded'),'false');
});
