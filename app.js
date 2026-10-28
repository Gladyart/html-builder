'use strict';
const $ = id => document.getElementById(id);
const preview = $('preview');
const defaultHTML = `<div class="kb-page"><h1>HTML Document</h1><p class="lede">Short description of this document.</p><details class="kb-section" open><summary><span>Getting started</span></summary><div class="section-body"><p>Click a component in the document tree to edit it. Add new components using the left panel.</p></div></details><p>&nbsp;</p></div>`;
const templates = {
 'Paragraph': '<p>New paragraph</p>',
 'Heading': '<h2>New heading</h2>',
 'Accordion': '<details class="kb-section" open><summary><span>New section</span></summary><div class="section-body"><p>Section content</p></div></details>',
 'Resource card': '<div class="resource-card"><div class="resource-link"><a href="#">Resource title</a></div><div class="resource-desc">Resource description</div></div>',
 'Warning': '<div class="callout warning"><p>Important information</p></div>',
 'License box': '<div class="license-box"><div class="license-head"><strong>License information</strong></div><p>License details</p></div>',
 'Image': '<figure><img src="" alt="Image placeholder"><figcaption>Image caption</figcaption></figure>',
 'List': '<ul><li>First item</li><li>Second item</li></ul>',
 'Container': '<div><p>Container content</p></div>',
 'Link': '<p><a href="https://example.com">Link text</a></p>'
};
const previewCSS = `
:root{--now-color_background--primary:#fff;--now-color_background--secondary:#f1f5f9;--now-color_text--primary:#1f2937;--now-color_text--secondary:#64748b;--now-color_border--primary:#cbd5e1;--now-color_link--primary:#0f6cbd;--now-color_alert--warning-0:#fff7ed;--now-color_alert--warning-2:#f59e0b}
:root[data-theme="dark"]{--now-color_background--primary:#1d2531;--now-color_background--secondary:#2b3543;--now-color_text--primary:#f1f5f9;--now-color_text--secondary:#b7c4d5;--now-color_border--primary:#64748b;--now-color_link--primary:#93c5fd;--now-color_alert--warning-0:#453522;--now-color_alert--warning-2:#fbbf24}
*{box-sizing:border-box}body{margin:0;padding:26px;background:var(--now-color_background--primary);color:var(--now-color_text--primary);font:15px/1.6 Inter,"Segoe UI",Arial,sans-serif} .kb-page{max-width:980px;margin:auto;padding:18px;background:var(--now-color_background--primary);color:var(--now-color_text--primary)}h1{font-size:30px;line-height:1.2;margin:0 0 8px}h2{font-size:20px}h3{font-size:16px}.lede{color:var(--now-color_text--secondary);margin:0 0 24px}.kb-section{border:1px solid var(--now-color_border--primary);border-radius:12px;margin:12px 0 20px;overflow:hidden;background:var(--now-color_background--primary)}.kb-section>summary{padding:14px 18px;background:var(--now-color_background--secondary);border-bottom:1px solid var(--now-color_border--primary);font-weight:600;cursor:pointer}.section-body{padding:16px 18px}.resource-card,.license-box,.stacked-item{padding:14px 16px;border:1px solid var(--now-color_border--primary);border-radius:10px;background:var(--now-color_background--secondary);margin:10px 0}.callout{padding:12px 14px;border:1px solid var(--now-color_border--primary);border-radius:8px;margin:10px 0}.warning{background:var(--now-color_alert--warning-0);border-left:4px solid var(--now-color_alert--warning-2)}a{color:var(--now-color_link--primary)}.resource-desc,.muted{color:var(--now-color_text--secondary)}img{max-width:100%;height:auto}figure{margin:14px 0;padding:10px;border:1px dashed var(--now-color_border--primary)}[data-kb-selected="true"]{outline:2px solid #4f9cf9!important;outline-offset:2px} [data-kb-selected="true"]:empty{min-height:18px} `;
let selected = null;
let currentHTML = defaultHTML;
let dirty = false;
let doc;
const textElements = new Set(['P','H1','H2','H3','H4','H5','H6','SPAN','STRONG','EM','LI','SUMMARY','A','FIGCAPTION']);
const voidElements = new Set(['IMG','BR','HR','INPUT']);
const inlineTags = new Set(['A','SPAN','STRONG','EM','B','I','U','SMALL','CODE']);
function sanitize(html){
 const parser = new DOMParser(); const parsed=parser.parseFromString(html,'text/html');
 parsed.querySelectorAll('script,style,iframe,object,embed,form,base,meta,link').forEach(n=>n.remove());
 for(const el of parsed.body.querySelectorAll('*')){
   for(const attr of [...el.attributes]){
     const name=attr.name.toLowerCase(), value=attr.value.trim();
     if(name.startsWith('on')||name==='srcdoc'||name==='contenteditable'||name==='data-kb-selected'||name==='data-kb-id')el.removeAttribute(attr.name);
     if(['href','src','xlink:href'].includes(name) && /^(javascript:|data:|vbscript:)/i.test(value))el.removeAttribute(attr.name);
   }
 }
 return parsed.body.innerHTML;
}
function articleHTML(){
 if(!doc)return currentHTML;
 const clone=doc.body.cloneNode(true);
 clone.querySelectorAll('[data-kb-selected]').forEach(el=>el.removeAttribute('data-kb-selected'));
 return clone.innerHTML;
}
function setStatus(msg){$('status').textContent=msg;}
function markDirty(){dirty=true;currentHTML=articleHTML();setStatus('Unsaved changes');}
function load(html){currentHTML=sanitize(html);selected=null;preview.srcdoc=`<!doctype html><html data-theme="${$('theme').value}"><head><meta charset="utf-8"><style>${previewCSS}</style></head><body>${currentHTML}</body></html>`;}
preview.addEventListener('load',()=>{
 doc=preview.contentDocument;
 doc.addEventListener('click',e=>{
  const target=e.target.closest('body *');
  if(target && target!==doc.body){e.preventDefault();selectNode(target);}
 });
 selectNode(doc.body);renderTree();setStatus('Ready');
});
function selectNode(node){
 if(!node || !doc?.body.contains(node))return;
 if(selected?.isConnected)selected.removeAttribute('data-kb-selected');
 selected=node;
 if(selected!==doc.body)selected.setAttribute('data-kb-selected','true');
 renderTree();renderProperties();
}
function labelFor(el){let name=el.tagName.toLowerCase();if(el.className && typeof el.className==='string')name+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');const content=el.textContent?.trim().slice(0,28);return `${name}${content?' · '+content:''}`;}
function renderTree(){
 const tree=$('tree');tree.replaceChildren();if(!doc)return;
 const draw=(el,parent,depth)=>{
  if(depth>18)return;
  const row=document.createElement('button');row.className='tree-row'+(el===selected?' selected':'');row.textContent=labelFor(el);row.title=el.tagName.toLowerCase();row.onclick=()=>selectNode(el);parent.appendChild(row);
  const kids=[...el.children];if(kids.length){const wrap=document.createElement('div');wrap.className='tree-children';parent.appendChild(wrap);kids.forEach(child=>draw(child,wrap,depth+1));}
 };
 draw(doc.body,tree,0);
}
function field(name,value,onChange,multiline=false){const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.textContent=name;const input=document.createElement(multiline?'textarea':'input');input.value=value??'';input.addEventListener('change',()=>onChange(input.value));wrap.append(label,input);return wrap;}
function renderProperties(){
 const box=$('properties');box.replaceChildren();if(!selected)return;
 const el=selected;
 const meta=document.createElement('strong');meta.textContent=el.tagName.toLowerCase();box.appendChild(meta);
 if(el===doc.body){box.appendChild(document.createTextNode('Select an element to edit its properties.'));return;}
 const apply=(fn)=>{fn();markDirty();renderTree();renderProperties();};
 box.appendChild(field('CSS classes',el.className, v=>apply(()=>el.className=v)));
 if(textElements.has(el.tagName)){
  box.appendChild(field('Text',el.textContent,v=>apply(()=>{el.textContent=v;}),true));
 } else if(el.tagName==='IMG'){
  box.appendChild(field('Image URL',el.getAttribute('src')||'',v=>apply(()=>{if(!/^\s*(javascript:|data:)/i.test(v))el.setAttribute('src',v);} )));
  box.appendChild(field('Alt text',el.getAttribute('alt')||'',v=>apply(()=>el.setAttribute('alt',v))));
 }
 if(el.tagName==='A')box.appendChild(field('Link URL',el.getAttribute('href')||'',v=>apply(()=>{if(!/^\s*(javascript:|data:)/i.test(v))el.setAttribute('href',v);} )));
 if(el.tagName==='DETAILS'){
  const row=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=el.open;cb.onchange=()=>apply(()=>{el.open=cb.checked;});row.append(cb,' Open in preview');box.append(row);
 }
 box.appendChild(field('Inline spacing / layout CSS',el.getAttribute('style')||'',v=>apply(()=>el.setAttribute('style',v)),true));
 box.appendChild(field('Element HTML (advanced)',el.outerHTML,v=>{
  const fragment=doc.createElement('template');fragment.innerHTML=sanitize(v);const replacement=fragment.content.firstElementChild;
  if(!replacement){setStatus('Invalid HTML');return;}
  el.replaceWith(replacement);markDirty();selectNode(replacement);
 },true));
}
function addComponent(name){
 if(!doc)return;
 const template=doc.createElement('template');template.innerHTML=templates[name];const node=template.content.firstElementChild;if(!node)return;
 const target=selected||doc.body;
 // Insert into structural containers, otherwise as sibling after current element.
 const containers=new Set(['BODY','DIV','SECTION','ARTICLE','MAIN','ASIDE','DETAILS','UL','OL','FIGURE']);
 if(containers.has(target.tagName)){
   if(target.tagName==='DETAILS' && target.querySelector(':scope > summary')){
    const last=target.lastElementChild; if(last?.tagName==='SUMMARY')last.after(node);else target.append(node);
   }else target.append(node);
 }else if(target.parentElement){target.after(node);}else doc.body.append(node);
 markDirty();selectNode(node);setStatus(`Added ${name}`);
}
function moveSelected(dir){if(!selected||selected===doc.body)return;const el=selected;if(dir<0 && el.previousElementSibling)el.previousElementSibling.before(el);if(dir>0 && el.nextElementSibling)el.nextElementSibling.after(el);markDirty();selectNode(el);}
function cloneSelected(){if(!selected||selected===doc.body)return;const el=selected.cloneNode(true);el.removeAttribute('data-kb-selected');selected.after(el);markDirty();selectNode(el);}
function deleteSelected(){if(!selected||selected===doc.body)return;const next=selected.parentElement;selected.remove();markDirty();selectNode(next);}
function openSource(){$('sourceText').value=articleHTML();$('sourceDialog').showModal();}
function filtersHTML(){return [{name:'HTML',extensions:['html','htm']},{name:'All files',extensions:['*']}];}
function filtersProject(){return [{name:'HTML Builder Project',extensions:['htmlproj']},{name:'JSON project',extensions:['json']},{name:'Legacy KB project',extensions:['kbproj']}];}
async function importFile(project=false){const file=await window.kbFiles.open(project?filtersProject():filtersHTML());if(!file)return;try{
 let html=file.content;if(project){const data=JSON.parse(file.content);if(!data || typeof data.html!=='string')throw Error('Project must contain an HTML string');if(data.format && !['html-builder','kb-article-builder'].includes(data.format))throw Error('Unsupported project format');html=data.html;}
 load(html);dirty=false;setStatus(`Opened ${file.name}`);
}catch(err){alert('Could not open file: '+err.message);}}
async function exportFile(project=false){const html=articleHTML();const content=project?JSON.stringify({format:'html-builder',version:1,html},null,2):html;const name=project?'document.htmlproj':'document.html';const path=await window.kbFiles.save({name,content,filters:project?filtersProject():filtersHTML()});if(path){if(project)dirty=false;setStatus(`${project?'Saved project':'Exported HTML'}: ${path.split(/[\\/]/).pop()}`);}}
for(const name of Object.keys(templates)){const btn=document.createElement('button');btn.textContent='+ '+name;btn.onclick=()=>addComponent(name);$('components').append(btn);}
$('newBtn').onclick=()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;load(defaultHTML);dirty=false;};
$('openBtn').onclick=()=>importFile(false);$('projectBtn').onclick=()=>importFile(true);
$('saveProjectBtn').onclick=()=>exportFile(true);$('exportBtn').onclick=()=>exportFile(false);
$('theme').onchange=()=>{if(doc)doc.documentElement.dataset.theme=$('theme').value;};
$('refreshTreeBtn').onclick=renderTree;$('upBtn').onclick=()=>moveSelected(-1);$('downBtn').onclick=()=>moveSelected(1);$('duplicateBtn').onclick=cloneSelected;$('deleteBtn').onclick=deleteSelected;
$('sourceBtn').onclick=openSource;$('closeSource').onclick=()=>$('sourceDialog').close();
$('copySource').onclick=async()=>{await navigator.clipboard.writeText($('sourceText').value);setStatus('HTML copied');};
$('applySource').onclick=()=>{load($('sourceText').value);dirty=true;$('sourceDialog').close();};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load(defaultHTML);
