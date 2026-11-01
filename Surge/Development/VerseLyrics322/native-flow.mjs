// Build-time lowering of this project's async functions. Native complete bodies,
// cache hits and busy responses must not keep a host VM alive for Promise jobs.
// Acorn is the exact parser already pinned by Terser in pnpm-lock.yaml.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parse}=createRequire(require.resolve('terser'))('acorn');
export function extractFunctions(source, names) {
  const declarations=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name));
  if (declarations.length !== names.length) throw Error('Missing/duplicate lazy provider declaration');
  const definitions=declarations.map(n=>source.slice(n.start,n.end));
  for (const n of declarations.reverse()) source=source.slice(0,n.start)+source.slice(n.end);
  return {source,definitions};
}
export const runner = `
function nativeRun(iterator) {
  function resume(method, value) {
    for (;;) {
      const step = iterator[method](value);
      if (step.done) { iterator = null; return step.value; }
      const next = step.value;
      if (next != null && typeof next.then === "function")
        return next.then(value => resume("next",value), error => resume("throw",error));
      method = "next"; value = next;
    }
  }
  return resume("next");
}
`;
export function localUntilIO(source, names = null) {
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'}),edits=[];
  function walk(node,owner) {
    if(!node||typeof node!=='object')return;
    if(node.type==='FunctionDeclaration'||node.type==='FunctionExpression'||node.type==='ArrowFunctionExpression'){
      owner=node;
      if(node.async && (!names || names.includes(node.id?.name))){
        node.lowerNative=true;
        // Only the shapes used by the source are supported. Fail a build on
        // new lexical-arguments/this, generator, arrow or async method shapes.
        if(node.type!=='FunctionDeclaration'||node.generator||!source.startsWith('async function',node.start))throw Error('Unsupported async function shape');
        if(!node.id)throw Error('Named native function required');
        const args=node.params.map(p=>p.type==='Identifier'?p.name:p.type==='AssignmentPattern'&&p.left.type==='Identifier'?p.left.name:null);
        if(args.some(x=>!x))throw Error('Unsupported native parameter');
        const inner='nativeStep_'+node.id.name;
        if(source.includes(inner))throw Error('Native function name collision');
        // A top-level generator avoids a second capturing function/context on
        // every cold invocation. Defaults stay solely in the generator header.
        edits.push([node.start,node.start+14,'function*']);
        edits.push([node.id.start,node.id.end,inner]);
        edits.push([node.end,node.end,'\nfunction '+node.id.name+'('+args.join(',')+'){return nativeRun('+inner+'('+args.join(',')+'));}']);
      }
    }
    if(owner?.lowerNative&&(node.type==='ThisExpression'||node.type==='Identifier'&&node.name==='arguments'))throw Error('Unsupported lexical binding in native lowering');
    if(node.type==='AwaitExpression' && owner?.lowerNative){
      edits.push([node.start,node.start+5,'(yield']);
      edits.push([node.end,node.end,')']);
    }
    for(const [key,value]of Object.entries(node)){
      if(key==='start'||key==='end'||key==='type')continue;
      if(Array.isArray(value)){for(const child of value)if(child?.type)walk(child,owner);}
      else if(value?.type)walk(value,owner);
    }
  }
  walk(ast);
  edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  let end=source.length;
  for(const [a,b,text]of edits){if(b>end)throw Error('Overlapping native lowering');source=source.slice(0,a)+text+source.slice(b);end=a;}
  parse(source,{ecmaVersion:'latest',sourceType:'script'});
  return source;
}
