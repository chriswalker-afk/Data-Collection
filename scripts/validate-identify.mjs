import {readFileSync} from 'node:fs';
import {validateIdentifyBank} from '../src/identify.js';
const url=new URL('../content/scenarios.json',import.meta.url);
const {scenarios}=JSON.parse(readFileSync(url,'utf8'));
validateIdentifyBank(scenarios);
console.log('PASS: '+scenarios.length+' Which Method? cases have exact evidence and a distinguishing explanation for every incorrect sampling method.');
