import {readFileSync} from 'node:fs';
import {assessDesktopScreen} from './budget.mjs';
const report=JSON.parse(readFileSync(new URL('./evidence/memory-screen.json',import.meta.url),'utf8'));
const result=assessDesktopScreen(report);console.log(JSON.stringify(result));
// A missing device trace must never silently pass a mobile release check.
process.exitCode=process.argv.includes('--release')?2:result.screen==='below-mobile-reference'?0:1;
