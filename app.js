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
*{box-sizing:border-box}body{margin:0;padding:26px;background:var(--now-color_background--primary);color:var(--now-color_text--primary);font:15px/1.6 Inter,"Segoe UI",Arial,sans-serif} .kb-page{max-width:980px;margin:auto;padding:18px;background:var(--now-color_background--primary);color:var(--now-color_text--primary)}h1{font-size:30px;line-height:1.2;margin:0 0 8px}h2{font-size:20px}h3{font-size:16px}.lede{color:var(--now-color_text--secondary);margin:0 0 24px}.kb-section{border:1px solid var(--now-color_border--primary);border-radius:12px;margin:12px 0 20px;overflow:hidden;background:var(--now-color_background--primary)}.kb-section>summary{padding:14px 18px;background:var(--now-color_background--secondary);border-bottom:1px solid var(--now-color_border--primary);font-weight:600;cursor:pointer}.section-body{padding:16px 18px}.resource-card,.license-box,.stacked-item{padding:14px 16px;border:1px solid var(--now-color_border--primary);border-radius:10px;background:var(--now-color_background--secondary);margin:10px 0}.callout{padding:12px 14px;border:1px solid var(--now-color_border--primary);border-radius:8px;margin:10px 0}.warning{background:var(--now-color_alert--warning-0);border-left:4px solid var(--now-color_alert--warning-2)}a{color:var(--now-color_link--primary)}.resource-desc,.muted{color:var(--now-color_text--secondary)}img{max-width:100%;height:auto}figure{margin:14px 0;padding:10px;border:1px dashed var(--now-color_border--primary)}[data-kb-selected="true"]{outline:3px solid #2563eb!important;outline-offset:2px;position:relative} body *:hover{outline-color:#93c5fd} [data-kb-selected="true"]:empty{min-height:18px} [data-html-drop-target]{outline:3px dashed #2563eb!important;outline-offset:3px} `;
// Internal identities are held outside the article DOM and never exported.
let elementIds = new WeakMap();
let idCounter = 0;
function internalId(el) {
 if (!elementIds.has(el)) elementIds.set(el, `node-${++idCounter}`);
 return elementIds.get(el);
}
function indexElements(root) {
 internalId(root);
 for (const el of root.querySelectorAll('*')) internalId(el);
}
let selected = null;
let currentHTML = defaultHTML;
let dirty = false;
let pendingSelectionId = null;
let doc;
let dragPayload = null;
let previewDrop = null;
let lastChildByParent = new WeakMap();
const propertyGroupState = {general:true,layout:false,advanced:false};
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
function load(html){currentHTML=sanitize(html);selected=null;elementIds=new WeakMap();idCounter=0;preview.srcdoc=`<!doctype html><html data-theme="${$('theme').value}"><head><meta charset="utf-8"><style>${previewCSS}</style></head><body>${currentHTML}</body></html>`;}
preview.addEventListener('load',()=>{
 doc=preview.contentDocument;
 indexElements(doc.body);
 setupPreviewDnD();
 doc.addEventListener('click',e=>{
  const target=e.target.closest('body *');
  if(target && target!==doc.body){e.preventDefault();e.stopPropagation();selectNode(target);}
 });
 selectNode(doc.body);renderTree();setStatus('Ready · click an element to select it');
});
function selectNode(node){
 if(!node || !doc?.body.contains(node))return;
 if(selected?.isConnected)selected.removeAttribute('data-kb-selected');
 if(selected?.parentElement)lastChildByParent.set(selected.parentElement,selected);
 selected=node;internalId(node);
 if(selected!==doc.body)selected.setAttribute('data-kb-selected','true');
 renderTree();renderProperties();renderBreadcrumbs();updateNavigation();
}
function labelFor(el){let name=el.tagName.toLowerCase();if(el.className && typeof el.className==='string')name+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');const content=el.textContent?.trim().slice(0,28);return `${name}${content?' · '+content:''}`;}
function renderTree(){
 const tree=$('tree');tree.replaceChildren();if(!doc)return;
 const draw=(el,parent,depth)=>{
  if(depth>18)return;
  const row=document.createElement('button');row.className='tree-row'+(el===selected?' selected':'');row.textContent=labelFor(el);row.title=`${internalId(el)} · ${el.tagName.toLowerCase()}`;row.onclick=()=>selectNode(el);row.draggable=el!==doc.body;row.dataset.nodeId=internalId(el);wireTreeDnD(row,el);parent.appendChild(row);
  const kids=[...el.children];if(kids.length){const wrap=document.createElement('div');wrap.className='tree-children';parent.appendChild(wrap);kids.forEach(child=>draw(child,wrap,depth+1));}
 };
 draw(doc.body,tree,0);
}
function field(name,value,onChange,multiline=false){const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.textContent=name;const input=document.createElement(multiline?'textarea':'input');input.value=value??'';input.addEventListener('change',()=>onChange(input.value));wrap.append(label,input);return wrap;}

function renderBreadcrumbs(){
 const bar=$('breadcrumbs');bar.replaceChildren();if(!doc||!selected)return;
 const chain=[];let n=selected;
 while(n && doc.body.contains(n)){chain.unshift(n);if(n===doc.body)break;n=n.parentElement;}
 for(const [i,el] of chain.entries()){
  if(i){const sep=document.createElement('span');sep.textContent='›';sep.className='crumb-separator';bar.append(sep);}
  const btn=document.createElement('button');btn.className='crumb'+(el===selected?' active':'');
  btn.textContent=el.tagName.toLowerCase()+(el.classList?.length?'.'+[...el.classList].slice(0,1).join(''):'');
  btn.title='Select '+labelFor(el);btn.onclick=()=>selectNode(el);bar.append(btn);
 }
}
function updateNavigation(){
 $('parentBtn').disabled=!selected||selected===doc?.body;
 $('childBtn').disabled=!selected||!selected.children.length;
}
function propertyGroup(box,key,title){
 const group=document.createElement('details');group.className='property-section';group.open=propertyGroupState[key];
 const summary=document.createElement('summary');summary.textContent=title;group.append(summary);
 const content=document.createElement('div');content.className='property-section-content';group.append(content);
 group.addEventListener('toggle',()=>{propertyGroupState[key]=group.open;});
 box.append(group);return content;
}

function renderProperties(){
 const box=$('properties');box.replaceChildren();if(!selected)return;
 const el=selected;
 const meta=document.createElement('strong');meta.textContent=`<${el.tagName.toLowerCase()}>`;
 const idLabel=document.createElement('div');idLabel.className='internal-id';idLabel.textContent=`Editor ID: ${internalId(el)} (not exported)`;
 box.append(meta,idLabel);
 if(el===doc.body){box.appendChild(document.createTextNode('Select an element to edit its properties.'));return;}
 const apply=fn=>{fn();markDirty();renderTree();renderProperties();renderBreadcrumbs();};
 const general=propertyGroup(box,'general','General properties');
 general.appendChild(field('HTML id attribute',el.id,v=>apply(()=>{if(v)el.id=v;else el.removeAttribute('id');})));
 general.appendChild(field('CSS classes',el.className,v=>apply(()=>el.className=v)));
 general.appendChild(field('Title / tooltip',el.getAttribute('title')||'',v=>apply(()=>{if(v)el.setAttribute('title',v);else el.removeAttribute('title');})));
 if(textElements.has(el.tagName))general.appendChild(field('Text',el.textContent,v=>apply(()=>{el.textContent=v;}),true));
 else if(el.tagName==='IMG'){
  general.appendChild(field('Image URL',el.getAttribute('src')||'',v=>apply(()=>{if(!/^\s*(javascript:|data:)/i.test(v))el.setAttribute('src',v);} )));
  general.appendChild(field('Alt text',el.getAttribute('alt')||'',v=>apply(()=>el.setAttribute('alt',v))));
 }
 if(el.tagName==='A')general.appendChild(field('Link URL',el.getAttribute('href')||'',v=>apply(()=>{if(!/^\s*(javascript:|data:)/i.test(v))el.setAttribute('href',v);} )));
 if(el.tagName==='DETAILS'){
  const row=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=el.open;cb.onchange=()=>apply(()=>{el.open=cb.checked;});row.append(cb,' Open in preview');general.append(row);
 }
 const layout=propertyGroup(box,'layout','Layout and spacing');
 const styleField=(label,property)=>layout.appendChild(field(label,el.style.getPropertyValue(property),v=>apply(()=>{if(v.trim())el.style.setProperty(property,v.trim());else el.style.removeProperty(property);} )));
 styleField('Display (block, flex, grid...)','display');styleField('Width (px, %, auto...)','width');
 styleField('Padding','padding');styleField('Margin','margin');styleField('Gap','gap');styleField('Text align','text-align');
 const advanced=propertyGroup(box,'advanced','Advanced CSS and HTML');
 advanced.appendChild(field('Inline CSS',el.getAttribute('style')||'',v=>apply(()=>{if(v.trim())el.setAttribute('style',v);else el.removeAttribute('style');}),true));
 advanced.appendChild(field('Element HTML',el.outerHTML,v=>{
  const fragment=doc.createElement('template');fragment.innerHTML=sanitize(v);const replacement=fragment.content.firstElementChild;
  if(!replacement){setStatus('Invalid HTML');return;}
  el.replaceWith(replacement);markDirty();selectNode(replacement);
 },true));
}

function addComponent(name){
 if(!doc)return;
 const template=doc.createElement('template');template.innerHTML=templates[name];const node=template.content.firstElementChild;if(!node)return;
 const target=selected||doc.body;internalId(node);
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
function cloneSelected(){if(!selected||selected===doc.body)return;const el=selected.cloneNode(true);el.removeAttribute('data-kb-selected');indexElements(el);selected.after(el);markDirty();selectNode(el);}
function deleteSelected(){if(!selected||selected===doc.body)return;const next=selected.parentElement;selected.remove();markDirty();selectNode(next);}
function openSource(){$('sourceText').value=articleHTML();$('sourceDialog').showModal();}
function filtersHTML(){return [{name:'HTML',extensions:['html','htm']},{name:'All files',extensions:['*']}];}
function filtersProject(){return [{name:'HTML Builder Project',extensions:['htmlproj']},{name:'JSON project',extensions:['json']},{name:'Legacy KB project',extensions:['kbproj']}];}
async function importFile(project=false){const file=await window.kbFiles.open(project?filtersProject():filtersHTML());if(!file)return;try{
 let html=file.content;if(project){const data=JSON.parse(file.content);if(!data || typeof data.html!=='string')throw Error('Project must contain an HTML string');if(data.format && !['html-builder','kb-article-builder'].includes(data.format))throw Error('Unsupported project format');html=data.html;}
 load(html);dirty=false;setStatus(`Opened ${file.name}`);
}catch(err){alert('Could not open file: '+err.message);}}
async function exportFile(project=false){const html=articleHTML();const content=project?JSON.stringify({format:'html-builder',version:1,html},null,2):html;const name=project?'document.htmlproj':'document.html';const path=await window.kbFiles.save({name,content,filters:project?filtersProject():filtersHTML()});if(path){if(project)dirty=false;setStatus(`${project?'Saved project':'Exported HTML'}: ${path.split(/[\\/]/).pop()}`);}}
for(const name of Object.keys(templates)){const btn=document.createElement('button');btn.textContent='+ '+name;btn.draggable=true;btn.title='Drag into preview or document tree, or click to add';btn.addEventListener('dragstart',e=>startDrag(e,{kind:'template',name}));btn.onclick=()=>addComponent(name);$('components').append(btn);}

// Drag and drop operates on the actual document DOM; internal WeakMap IDs remain stable.
const blockTags = new Set(['DIV','SECTION','ARTICLE','MAIN','ASIDE','HEADER','FOOTER','NAV','DETAILS','FIGURE','BLOCKQUOTE','UL','OL','LI','TABLE','TBODY','THEAD','TFOOT','TR','TD','TH']);
const inlineOnly = new Set(['P','SPAN','A','STRONG','EM','B','I','U','SMALL','CODE','H1','H2','H3','H4','H5','H6','SUMMARY','BUTTON','LABEL']);
function findNodeById(id){
 if(!doc)return null;
 return [doc.body,...doc.body.querySelectorAll('*')].find(el=>internalId(el)===id)||null;
}
function startDrag(e,payload){
 dragPayload=payload;
 e.dataTransfer.effectAllowed=payload.kind==='node'?'move':'copy';
 e.dataTransfer.setData('text/plain','html-builder-drag');
}
function draggedNode(){return dragPayload?.kind==='node'?findNodeById(dragPayload.id):null;}
function nodeFromPayload(){
 if(dragPayload?.kind==='node')return draggedNode();
 if(dragPayload?.kind==='template'){
  const template=doc.createElement('template');template.innerHTML=templates[dragPayload.name];
  return template.content.firstElementChild;
 }
 return null;
}
function canPlace(node,target,position){
 if(!node||!target||!doc.body.contains(target))return false;
 if(node===doc.body)return false;
 if(dragPayload?.kind==='node' && (node===target||node.contains(target)))return false;
 const parent=position==='inside'?target:target.parentElement;
 if(!parent)return false;
 if(inlineOnly.has(parent.tagName))return false;
 if(['IMG','BR','HR','INPUT'].includes(parent.tagName))return false;
 if(parent.tagName==='UL'||parent.tagName==='OL')return node.tagName==='LI';
 if(parent.tagName==='TABLE')return ['CAPTION','COLGROUP','THEAD','TBODY','TFOOT','TR'].includes(node.tagName);
 if(['THEAD','TBODY','TFOOT'].includes(parent.tagName))return node.tagName==='TR';
 if(parent.tagName==='TR')return ['TD','TH'].includes(node.tagName);
 if(parent.tagName==='DETAILS' && node.tagName==='SUMMARY')return ![...parent.children].some(el=>el.tagName==='SUMMARY'&&el!==node);
 if(node.tagName==='SUMMARY')return parent.tagName==='DETAILS';
 if(node.tagName==='LI')return ['UL','OL'].includes(parent.tagName);
 if(['TD','TH'].includes(node.tagName))return parent.tagName==='TR';
 if(node.tagName==='TR')return ['TABLE','TBODY','THEAD','TFOOT'].includes(parent.tagName);
 if(target===doc.body && position!=='inside')return false;
 return true;
}
function placeNode(target,position){
 const node=nodeFromPayload();
 if(!canPlace(node,target,position)){setStatus('Invalid drop location — choose another element or position');return false;}
 // Keep the required summary as the first child of details.
 if(position==='inside'){
  if(target.tagName==='DETAILS'&&target.firstElementChild?.tagName==='SUMMARY')target.append(node);
  else target.append(node);
 }else if(position==='before'){
  if(target.tagName==='SUMMARY'&&target.parentElement?.tagName==='DETAILS')return false;
  target.before(node);
 }else{
  if(target.tagName==='SUMMARY'&&target.parentElement?.tagName==='DETAILS')target.after(node);
  else target.after(node);
 }
 indexElements(node);markDirty();selectNode(node);
 setStatus(`${dragPayload.kind==='template'?'Added '+dragPayload.name:'Moved element'} · ${position} ${target.tagName.toLowerCase()}`);
 return true;
}
function clearTreeHints(){document.querySelectorAll('.drop-before,.drop-after,.drop-inside').forEach(el=>el.classList.remove('drop-before','drop-after','drop-inside'));}
function treeDropPosition(e,row){const r=row.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;return y<.25?'before':y>.75?'after':'inside';}
function wireTreeDnD(row,el){
 row.addEventListener('dragstart',e=>{e.stopPropagation();startDrag(e,{kind:'node',id:internalId(el)});});
 row.addEventListener('dragover',e=>{
  if(!dragPayload)return;const pos=treeDropPosition(e,row),node=nodeFromPayload();
  if(!canPlace(node,el,pos))return;
  e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=dragPayload.kind==='node'?'move':'copy';
  clearTreeHints();row.classList.add('drop-'+pos);row.dataset.dropPosition=pos;
 });
 row.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();const pos=treeDropPosition(e,row);clearTreeHints();placeNode(el,pos);dragPayload=null;});
 row.addEventListener('dragleave',()=>row.classList.remove('drop-before','drop-after','drop-inside'));
 row.addEventListener('dragend',()=>{clearTreeHints();dragPayload=null;});
}
function clearPreviewHint(){
 if(previewDrop?.target?.isConnected)previewDrop.target.removeAttribute('data-html-drop-target');
 previewDrop=null;
}
function previewTarget(e){
 const el=e.target?.nodeType===1?e.target:e.target?.parentElement;
 return el?.closest('body *')||doc.body;
}
function previewPosition(e,el){
 if(el===doc.body)return 'inside';
 const r=el.getBoundingClientRect();
 if(!r.height)return 'after';
 const fraction=(e.clientY-r.top)/r.height;
 if(fraction<.22)return 'before';
 if(fraction>.78)return 'after';
 return blockTags.has(el.tagName)?'inside':'after';
}
function setupPreviewDnD(){
 doc.addEventListener('dragstart',e=>{
  const el=previewTarget(e);
  if(el===doc.body)return;
  startDrag(e,{kind:'node',id:internalId(el)});
 });
 doc.addEventListener('dragover',e=>{
  if(!dragPayload)return;
  let el=previewTarget(e),pos=previewPosition(e,el),node=nodeFromPayload();
  // If an inline leaf cannot contain the block, offer insertion next to it.
  if(!canPlace(node,el,pos) && pos==='inside')pos='after';
  if(!canPlace(node,el,pos)){clearPreviewHint();return;}
  e.preventDefault();e.dataTransfer.dropEffect=dragPayload.kind==='node'?'move':'copy';
  if(previewDrop?.target!==el)clearPreviewHint();
  previewDrop={target:el,position:pos};el.setAttribute('data-html-drop-target',pos);
 });
 doc.addEventListener('drop',e=>{
  if(!dragPayload)return;
  e.preventDefault();const target=previewDrop?.target,position=previewDrop?.position;
  clearPreviewHint();if(target&&position)placeNode(target,position);
  dragPayload=null;
 });
 doc.addEventListener('dragleave',e=>{if(!e.relatedTarget||!doc.documentElement.contains(e.relatedTarget))clearPreviewHint();});
 doc.addEventListener('dragend',()=>{clearPreviewHint();dragPayload=null;});
 // Allow moving existing nodes by dragging the currently selected element in preview.
 doc.addEventListener('mousedown',e=>{
  const el=previewTarget(e);
  for(const node of doc.querySelectorAll('[draggable="true"]'))node.removeAttribute('draggable');
  if(el!==doc.body)el.setAttribute('draggable','true');
 });
}
window.addEventListener('dragend',()=>{clearTreeHints();clearPreviewHint();dragPayload=null;});

$('newBtn').onclick=()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;load(defaultHTML);dirty=false;};
$('openBtn').onclick=()=>importFile(false);$('projectBtn').onclick=()=>importFile(true);
$('saveProjectBtn').onclick=()=>exportFile(true);$('exportBtn').onclick=()=>exportFile(false);
$('theme').onchange=()=>{if(doc)doc.documentElement.dataset.theme=$('theme').value;};
$('parentBtn').onclick=()=>{if(selected?.parentElement && doc.body.contains(selected.parentElement))selectNode(selected.parentElement);};
$('childBtn').onclick=()=>{if(!selected)return;const last=lastChildByParent.get(selected);selectNode(last?.parentElement===selected?last:selected.firstElementChild);};
$('zoom').onchange=()=>{const stage=$('preview-stage');stage.style.width=(10000/Number($('zoom').value))+'%';stage.style.height=(10000/Number($('zoom').value))+'%';stage.style.transform='scale('+Number($('zoom').value)/100+')';};
$('refreshTreeBtn').onclick=renderTree;$('upBtn').onclick=()=>moveSelected(-1);$('downBtn').onclick=()=>moveSelected(1);$('duplicateBtn').onclick=cloneSelected;$('deleteBtn').onclick=deleteSelected;
$('sourceBtn').onclick=openSource;$('closeSource').onclick=()=>$('sourceDialog').close();
$('copySource').onclick=async()=>{await navigator.clipboard.writeText($('sourceText').value);setStatus('HTML copied');};
$('applySource').onclick=()=>{load($('sourceText').value);dirty=true;$('sourceDialog').close();setStatus('HTML source applied · unsaved changes');};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load(defaultHTML);
