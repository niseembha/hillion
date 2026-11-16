import test from 'node:test';
import assert from 'node:assert/strict';
import {getMystery,mystery,roster} from '../src/data.js';
import {cases} from '../src/data/cases.js';
test('provided roster and prototype case resolve without contact data',()=>{
 assert.equal(roster.length,100);assert.equal(mystery.studentId,'niseem-bhattacharya');
 assert.equal(mystery.name,'Niseem Bhattacharya');assert.equal(mystery.date,null);
 assert.equal(getMystery('1999-01-01'),null);assert.equal(mystery.clues.length,7);
 assert.ok(!JSON.stringify(roster).includes('@'));assert.equal(new Set(roster.map(s=>s.id)).size,100);
 for(const c of cases){assert.ok(roster.some(s=>s.id===c.studentId));assert.equal(c.clues.length,7);}
});
