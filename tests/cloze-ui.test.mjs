import test from 'node:test';
import assert from 'node:assert/strict';
import {clozePresentation} from '../src/cloze-ui.js';
const base={answered:false,status:null,choice:null,draft:'',hintUsed:false};
test('the unanswered blank shows a draft only in typed levels',()=>{
 assert.equal(clozePresentation('choices',{...base,draft:'test'},'mean').display,'________');
 assert.deepEqual(clozePresentation('guided',{...base,draft:'mean'},'mean'),{outcome:'pending',preview:true,display:'mean'});
 assert.equal(clozePresentation('independent',base,'mean').preview,false);
});
test('presentation labels distinguish mastery, assisted recall and errors',()=>{
 for(const status of ['correct','assisted','wrong','skipped']){
  const result=clozePresentation('guided',{...base,answered:true,status},'mean');
  assert.equal(result.outcome,status==='correct'?'correct':status==='assisted'?'assisted':'incorrect');
  assert.equal(result.display,'mean');
 }
 assert.equal(clozePresentation('choices',{...base,answered:true,choice:'mean'},'mean').outcome,'correct');
 assert.equal(clozePresentation('choices',{...base,answered:true,choice:'mode'},'mean').outcome,'incorrect');
});
