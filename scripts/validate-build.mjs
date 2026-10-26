import {readFileSync} from 'node:fs';
import {validateBuildBank} from '../src/build-method.js';
import {DEPENDENCIES} from '../src/exam.js';
const {methods}=JSON.parse(readFileSync(new URL('../content/methods.json',import.meta.url),'utf8'));
validateBuildBank(methods);
const steps=methods.reduce((sum,method)=>sum+method.procedure.length,0);
const links=Object.values(DEPENDENCIES).reduce((sum,rows)=>sum+rows.length,0);
console.log('PASS: '+methods.length+' sampling procedures, '+steps+
 ' explained steps and '+links+' explicit dependency relationships are consistent.');
