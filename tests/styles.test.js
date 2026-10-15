import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM, VirtualConsole} from 'jsdom';

test('shipped stylesheet parses and retains the root color variables',()=>{
 const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
 const errors=[];
 const virtualConsole=new VirtualConsole();
 virtualConsole.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM(`<style>${css}</style>`,{virtualConsole});
 try{
  assert.deepEqual(errors,[]);
  const sheet=dom.window.document.styleSheets[0];
  assert.ok(sheet,'The stylesheet must parse');
  const root=[...sheet.cssRules].find(rule=>rule.selectorText===':root');
  assert.ok(root,'The root variable rule must remain a valid selector');
  for(const [name,value] of Object.entries({'--ink':'#233e35','--cream':'#f7f8f3','--green':'#183c34','--lime':'#dfedab','--line':'#e1e5db'})){
   assert.equal(root.style.getPropertyValue(name),value);
  }
 }finally{dom.window.close();}
});
