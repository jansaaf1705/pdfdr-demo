import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
import {PDFDocument} from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
const fabric=window.fabric;
pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const $=id=>document.getElementById(id),s={file:null,pdf:null,pages:[],i:0,zoom:1,loading:false,history:[],future:[],token:0,nativeEdits:[],directMode:false,textSpans:[],editing:null,previewPdf:null,previewVersion:0,previewApplied:-1,previewBusy:null,nativeUndo:[],nativeRedo:[]};
const c=new fabric.Canvas('overlay',{preserveObjectStacking:true});let drawMode=false;let showGrid=false;const gridSize=10;const page=()=>s.pages[s.i];const snapshot=()=>c.toJSON();function save(){if(s.loading||!page())return;page().objects=snapshot();const next=JSON.stringify(page().objects);if(s.history.at(-1)!==next)s.history.push(next);if(s.history.length>80)s.history.shift();s.future=[]}c.on('object:added',save);c.on('object:modified',save);c.on('object:removed',save);c.on('text:changed',save);c.on('selection:created',properties);c.on('selection:updated',properties);c.on('selection:cleared',properties);
const message=t=>$('status').textContent=t;function properties(){const o=c.getActiveObject(),el=$('properties');el.replaceChildren();if(!o){el.textContent='Select an object';return;}const add=(label,type,value,fn)=>{const l=document.createElement('label');l.textContent=label;l.style.display='block';l.style.margin='10px 0 3px';const input=document.createElement('input');input.type=type;input.value=value;input.style.width='100%';input.onchange=()=>{fn(input.value);c.requestRenderAll();save()};el.append(l,input)};if(o.type==='textbox'){
 add('Font size','number',o.fontSize,v=>o.set('fontSize',Math.max(6,Math.min(300,Number(v)||16))));
 add('Text color','color',o.fill||'#222222',v=>o.set('fill',v));
 const options=document.createElement('select');options.style.width='100%';options.style.marginTop='10px';
 for(const font of ['Arial','Helvetica','Times New Roman','Georgia','Courier New','Verdana','Trebuchet MS']){const opt=document.createElement('option');opt.textContent=font;opt.value=font;options.append(opt)}
 options.value=o.fontFamily||'Arial';options.onchange=()=>{o.set('fontFamily',options.value);c.requestRenderAll();save()};el.append('Font family',options);
 const align=document.createElement('select');align.style.width='100%';align.style.marginTop='10px';for(const v of ['left','center','right','justify']){const opt=document.createElement('option');opt.value=v;opt.textContent=v;align.append(opt)}align.value=o.textAlign||'left';align.onchange=()=>{o.set('textAlign',align.value);c.requestRenderAll();save()};el.append(' Alignment',align);
 const bold=document.createElement('button');bold.textContent='Bold';bold.onclick=()=>{o.set('fontWeight',o.fontWeight==='bold'?'normal':'bold');c.requestRenderAll();save()};
 const italic=document.createElement('button');italic.textContent='Italic';italic.onclick=()=>{o.set('fontStyle',o.fontStyle==='italic'?'normal':'italic');c.requestRenderAll();save()};el.append(bold,italic);
 }if(o.stroke)add('Line color','color',o.stroke,v=>o.set('stroke',v));add('Opacity %','number',Math.round(o.opacity*100),v=>o.set('opacity',Math.max(0,Math.min(1,Number(v)/100))));add('Rotation °','number',Math.round(o.angle||0),v=>o.rotate(Number(v)||0));if(o){add('X position','number',Math.round(o.left||0),v=>o.set('left',Number(v)||0));add('Y position','number',Math.round(o.top||0),v=>o.set('top',Number(v)||0));add('Width','number',Math.round(o.getScaledWidth()),v=>o.scaleX=Math.max(0.01,(Number(v)||1)/Math.max(1,o.width)));add('Height','number',Math.round(o.getScaledHeight()),v=>o.scaleY=Math.max(0.01,(Number(v)||1)/Math.max(1,o.height)));}}const persist=()=>{if(page()&&!s.loading)page().objects=snapshot()};
async function render(){finishEditing();if(!page())return;const token=++s.token;s.loading=true;const p=page(),scale=Math.min(1,780/p.width)*s.zoom,b=$('background');let w=Math.round(p.width*scale),h=Math.round(p.height*scale);if(p.source!==null){const pg=await (s.previewPdf||s.pdf).getPage(p.source+1),v=pg.getViewport({scale});w=Math.round(v.width);h=Math.round(v.height);b.width=w;b.height=h;await pg.render({canvasContext:b.getContext('2d'),viewport:v}).promise}else{b.width=w;b.height=h;b.getContext('2d').fillStyle='white';b.getContext('2d').fillRect(0,0,w,h)}if(token!==s.token)return;$('paper').style.width=w+'px';$('paper').style.height=h+'px';c.setDimensions({width:w,height:h});c.setZoom(scale);await new Promise(resolve=>c.loadFromJSON(p.objects||{objects:[]},resolve));c.isDrawingMode=drawMode;c.renderAll();s.history=[JSON.stringify(p.objects||{objects:[]})];s.future=[];s.loading=false;ui();properties();await refreshDirectText();if(s.previewApplied!==s.previewVersion&&!s.previewBusy)syncPreview()}
function ui(){
 $('count').textContent=`${s.i+1} / ${s.pages.length}`;
 $('zoom').textContent=Math.round(s.zoom*100)+'%';
 const holder=$('pages');holder.replaceChildren();
 s.pages.forEach((p,i)=>{
  const wrap=document.createElement('button');wrap.className='page'+(i===s.i?' active':'');wrap.draggable=true;wrap.title='Drag to reorder pages';
  const thumb=document.createElement('canvas');thumb.className='thumb';wrap.append(thumb);
  const label=document.createElement('span');label.textContent='Page '+(i+1);wrap.append(label);
  wrap.onclick=()=>go(i);
  wrap.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'};
  wrap.ondragover=e=>{e.preventDefault();wrap.classList.add('drop-target')};
  wrap.ondragleave=()=>wrap.classList.remove('drop-target');
  wrap.ondrop=async e=>{e.preventDefault();wrap.classList.remove('drop-target');const from=Number(e.dataTransfer.getData('text/plain'));if(!Number.isInteger(from)||from<0||from>=s.pages.length||from===i)return;persist();const [moved]=s.pages.splice(from,1);s.pages.splice(i,0,moved);s.i=i;await render();message('Page order updated. Download PDF to save.')};
  holder.append(wrap);thumbnail(p,thumb).catch(console.error);
 });
}
async function thumbnail(p,canvas){
 const max=116,scale=Math.min(max/p.width,148/p.height);canvas.width=Math.round(p.width*scale);canvas.height=Math.round(p.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(p.source!==null&&s.pdf){const pg=await (s.previewPdf||s.pdf).getPage(p.source+1);await pg.render({canvasContext:ctx,viewport:pg.getViewport({scale})}).promise}
 if(p.objects?.objects?.length){const fc=new fabric.StaticCanvas(null,{width:p.width,height:p.height,backgroundColor:'transparent'});await new Promise(r=>fc.loadFromJSON(p.objects,r));const image=new Image();image.src=fc.toDataURL({format:'png'});await image.decode();ctx.drawImage(image,0,0,canvas.width,canvas.height);fc.dispose()}
}
async function go(i){finishEditing();if(i<0||i>=s.pages.length||i===s.i)return;persist();s.i=i;await render()}
async function openDocument(f){if(!f)return;try{message('Opening PDF...');const data=await f.arrayBuffer();const pdf=await pdfjs.getDocument({data:new Uint8Array(data)}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),v=pg.getViewport({scale:1});pages.push({source:i-1,width:v.width,height:v.height,objects:{objects:[]}})}s.file=f;s.pdf=pdf;s.nativeEdits=[];s.nativeUndo=[];s.nativeRedo=[];s.textSpans=[];s.previewPdf=null;s.previewVersion=0;s.previewApplied=-1;s.pages=pages;s.i=0;$('name').textContent=f.name;$('welcome').hidden=true;$('paper').hidden=false;await render();message('PDF ready. Click “Click / tap to edit text” to edit original PDF text.')}catch(err){console.error(err);message('Could not open PDF: '+err.message)}}
$('file').onchange=e=>openDocument(e.target.files[0]);
function add(o){if(!page())return message('Upload a PDF first.');c.add(o);c.setActiveObject(o);c.renderAll()}
$('sign').onclick=()=>{if(!page())return message('Upload a PDF first.');const name=prompt('Enter signature text:');if(name)add(new fabric.Textbox(name,{left:65,top:95,width:250,fontFamily:'Georgia',fontStyle:'italic',fontSize:34,fill:'#1c2b44'}))};$('blank').onclick=async()=>{s.file=null;s.pdf=null;s.nativeEdits=[];s.nativeUndo=[];s.nativeRedo=[];s.textSpans=[];s.previewPdf=null;s.previewVersion=0;s.previewApplied=-1;s.pages=[{source:null,width:595,height:842,objects:{objects:[]}}];s.i=0;s.zoom=1;$('name').textContent='Untitled.pdf';$('welcome').hidden=true;$('paper').hidden=false;await render();message('Blank PDF created.')};$('text').onclick=()=>add(new fabric.Textbox('Double-click to edit',{left:60,top:75,width:270,fontSize:24,fill:'#222'}));$('rect').onclick=()=>add(new fabric.Rect({left:80,top:90,width:180,height:100,fill:'transparent',stroke:'#6256e9',strokeWidth:3}));$('circle').onclick=()=>add(new fabric.Circle({left:80,top:90,radius:65,fill:'transparent',stroke:'#6256e9',strokeWidth:3}));$('line').onclick=()=>add(new fabric.Line([70,110,280,110],{stroke:'#6256e9',strokeWidth:3}));$('photo').onclick=()=>$('image').click();$('image').onchange=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>fabric.Image.fromURL(reader.result,img=>{img.scaleToWidth(Math.min(250,img.width));img.set({left:60,top:90});add(img)});reader.readAsDataURL(f)};

// Native text replacement: a PyMuPDF redaction removes the original text before inserting new text.
// Replacements are queued and applied to the original PDF during export.

// Phase 7: positioned text hit regions and touch-friendly in-place editing.
// Original PDF operators are redacted and new text inserted by PyMuPDF on export.
// A PDF text span is the editable unit, not a reflowable Word paragraph.
const textLayer=$('textLayer');
function textScale(){return Math.min(1,780/page().width)*s.zoom}
function htmlColor(rgb){return '#'+(Number(rgb)>>>0).toString(16).padStart(6,'0').slice(-6)}
function rememberNativeEdit(){s.nativeUndo.push(JSON.stringify(s.nativeEdits));if(s.nativeUndo.length>60)s.nativeUndo.shift();s.nativeRedo=[];}
function restoreNativeEdits(serialized){finishEditing();s.nativeEdits=JSON.parse(serialized);s.previewVersion++;paintTextHits();syncPreview();}
function nativeUndo(){if(!s.nativeUndo.length)return false;const before=s.nativeUndo.pop();s.nativeRedo.push(JSON.stringify(s.nativeEdits));restoreNativeEdits(before);message('Undid original PDF text edit.');return true;}
function nativeRedo(){if(!s.nativeRedo.length)return false;const after=s.nativeRedo.pop();s.nativeUndo.push(JSON.stringify(s.nativeEdits));restoreNativeEdits(after);message('Redid original PDF text edit.');return true;}
function pdfFontFamily(name){const f=String(name||'').toLowerCase();if(/courier|mono/.test(f))return 'Courier New,monospace';if(/times|serif|garamond|georgia/.test(f))return 'Times New Roman,serif';return 'Arial,Helvetica,sans-serif';}
function currentEdit(spanIndex){return s.nativeEdits.find(e=>e.page===page().source&&e.spanIndex===spanIndex)}
async function syncPreview(){
 if(!s.file||!s.pdf)return;
 const version=s.previewVersion;
 if(s.previewApplied===version)return;
 if(s.previewBusy){await s.previewBusy;if(s.previewApplied===version)return;}
 const task=(async()=>{
  if(!s.nativeEdits.length){s.previewPdf=null;s.previewApplied=version;await renderPreviewPage();return;}
  message('Updating live PDF preview...');
  const fd=new FormData();fd.append('file',s.file);fd.append('edits',JSON.stringify(s.nativeEdits));
  const response=await fetch('/api/apply',{method:'POST',body:fd});
  if(!response.ok){let detail;try{detail=(await response.json()).error}catch{}throw Error(detail||'Preview update failed');}
  const bytes=new Uint8Array(await response.arrayBuffer());
  const updated=await pdfjs.getDocument({data:bytes}).promise;
  if(version!==s.previewVersion)return;
  s.previewPdf=updated;s.previewApplied=version;
  await renderPreviewPage();
  message('Live preview updated — deleted text stays removed.');
 })();
 s.previewBusy=task;
 try{await task}catch(err){message('Live preview error: '+err.message);console.error(err)}finally{if(s.previewBusy===task)s.previewBusy=null;if(version!==s.previewVersion)syncPreview()}
}
async function renderPreviewPage(){
 if(!page())return;
 const token=s.token,p=page(),source=p.source,b=$('background');
 const scale=textScale();const w=b.width,h=b.height;
 if(source===null){const ctx=b.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);return;}
 const pdf=s.previewPdf||s.pdf;
 const pg=await pdf.getPage(source+1);
 if(token!==s.token||p!==page())return;
 const viewport=pg.getViewport({scale});
 const temp=document.createElement('canvas');temp.width=Math.round(viewport.width);temp.height=Math.round(viewport.height);
 await pg.render({canvasContext:temp.getContext('2d'),viewport}).promise;
 if(token!==s.token||p!==page())return;
 const ctx=b.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(temp,0,0,w,h);
}
function finishEditing(){
 const ed=s.editing;if(!ed)return;
 s.editing=null;const value=ed.input.value;ed.input.remove();ed.bar?.remove();
 const old=currentEdit(ed.index);
 if(value!==ed.span.text||ed.formatChanged){
  rememberNativeEdit();
  if(old){Object.assign(old,{value,size:ed.size,color:ed.color,font:ed.font,align:ed.align,bold:ed.bold,italic:ed.italic})}else{s.nativeEdits.push({page:page().source,spanIndex:ed.index,rect:ed.span.rect,value,size:ed.size,color:ed.color,font:ed.font,align:ed.align,bold:ed.bold,italic:ed.italic})}
  s.previewVersion++;syncPreview();
 }else if(old){rememberNativeEdit();s.nativeEdits.splice(s.nativeEdits.indexOf(old),1);s.previewVersion++;syncPreview();}
 paintTextHits();
}
function paintTextHits(){
 textLayer.replaceChildren();if(!s.directMode||!page()||page().source===null)return;
 const scale=textScale();
 for(let i=0;i<s.textSpans.length;i++){
  const sp=s.textSpans[i],rect=sp.rect,edit=currentEdit(i);
  const hit=document.createElement('div');hit.className='hit'+(edit?' changed':'');
  hit.style.left=(rect[0]*scale)+'px';hit.style.top=(rect[1]*scale)+'px';
  hit.style.width=Math.max(8,(rect[2]-rect[0])*scale)+'px';hit.style.height=Math.max(12,(rect[3]-rect[1])*scale)+'px';
  hit.title='Edit: '+sp.text;hit.setAttribute('role','button');hit.setAttribute('tabindex','0');
  hit.setAttribute('aria-label','Edit PDF text: '+sp.text);
  hit.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginEditing(i)});
  hit.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();beginEditing(i)}};
  textLayer.append(hit);
 }
}
function beginEditing(i){
 finishEditing();const sp=s.textSpans[i];if(!sp)return;
 const scale=textScale(),r=sp.rect,old=currentEdit(i);
 const input=document.createElement('textarea');input.value=old?old.value:sp.text;input.spellcheck=false;input.wrap='soft';
 input.setAttribute('aria-label','Edit original PDF text');
 input.style.left=(r[0]*scale)+'px';input.style.top=(r[1]*scale)+'px';
 input.style.width=Math.max(130,(r[2]-r[0])*scale+40)+'px';input.style.minHeight=Math.max(35,(r[3]-r[1])*scale+16)+'px';input.style.height=input.style.minHeight;input.style.maxHeight='45vh';input.style.overflowY='auto';
 const ed={input,span:sp,index:i,size:old?.size??sp.size,color:old?.color??sp.color,font:old?.font??sp.font,align:old?.align??'left',bold:old?.bold??/bold/i.test(sp.font),italic:old?.italic??/italic|oblique/i.test(sp.font),formatChanged:false};
 const bar=document.createElement('div');bar.className='native-format';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Original text formatting');
 bar.style.left=Math.max(0,r[0]*scale)+'px';bar.style.top=Math.max(0,r[1]*scale-44)+'px';
 const size=document.createElement('input');size.type='number';size.min='4';size.max='80';size.step='0.5';size.value=ed.size;size.title='Font size';size.setAttribute('aria-label','Font size');
 const color=document.createElement('input');color.type='color';color.value=htmlColor(ed.color);color.title='Text color';color.setAttribute('aria-label','Text color');
 const align=document.createElement('select');align.title='Alignment';align.setAttribute('aria-label','Text alignment');for(const v of ['left','center','right']){const op=document.createElement('option');op.value=v;op.textContent=v;align.append(op)}align.value=ed.align;
 const bold=document.createElement('button');bold.textContent='B';bold.title='Bold';bold.type='button';
 const italic=document.createElement('button');italic.textContent='I';italic.title='Italic';italic.type='button';
 const done=document.createElement('button');done.textContent='Done';done.type='button';
 const resizeInput=()=>{input.style.height='auto';input.style.height=Math.min(Math.max(input.scrollHeight+4,parseFloat(input.style.minHeight)),window.innerHeight*.45)+'px'};
 const refresh=()=>{input.style.fontSize=Math.max(12,ed.size*scale)+'px';input.style.color=htmlColor(ed.color);input.style.fontFamily=pdfFontFamily(ed.font);input.style.fontWeight=ed.bold?'bold':'normal';input.style.fontStyle=ed.italic?'italic':'normal';input.style.textAlign=ed.align;bold.classList.toggle('active',ed.bold);italic.classList.toggle('active',ed.italic);resizeInput()};
 // Prevent pointer interactions with formatting controls from blurring the text field.
 bar.addEventListener('pointerdown',e=>e.stopPropagation());
 size.oninput=()=>{ed.size=Math.max(4,Math.min(80,Number(size.value)||sp.size));ed.formatChanged=true;refresh()};
 color.oninput=()=>{ed.color=parseInt(color.value.slice(1),16);ed.formatChanged=true;refresh()};
 align.onchange=()=>{ed.align=align.value;ed.formatChanged=true;refresh()};
 bold.onclick=()=>{ed.bold=!ed.bold;ed.formatChanged=true;refresh();input.focus()};
 italic.onclick=()=>{ed.italic=!ed.italic;ed.formatChanged=true;refresh();input.focus()};
 done.onclick=()=>finishEditing();
 bar.append(size,color,align,bold,italic,done);textLayer.append(input,bar);ed.bar=bar;s.editing=ed;refresh();
 input.addEventListener('input',resizeInput);
 input.addEventListener('blur',()=>{setTimeout(()=>{if(s.editing===ed&&!bar.contains(document.activeElement))finishEditing()},90)});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value=old?old.value:sp.text;ed.size=old?.size??sp.size;ed.color=old?.color??sp.color;ed.font=old?.font??sp.font;ed.align=old?.align??'left';ed.bold=old?.bold??/bold/i.test(sp.font);ed.italic=old?.italic??/italic|oblique/i.test(sp.font);ed.formatChanged=false;input.blur()}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();finishEditing()}});
 requestAnimationFrame(()=>{input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length)})
}
async function refreshDirectText(){finishEditing();textLayer.replaceChildren();s.textSpans=[];if(!s.directMode||!s.file||!page()||page().source===null)return;try{const fd=new FormData();fd.append('file',s.file);fd.append('page',String(page().source));const res=await fetch('/api/text',{method:'POST',body:fd});const data=await res.json();if(!res.ok)throw Error(data.error);if(data.rotation)throw Error('Rotated PDF pages not yet supported for direct text editing');s.textSpans=data.spans;paintTextHits();message(s.textSpans.length?`${s.textSpans.length} editable text regions found. Click an outlined region to show the cursor.`:'No selectable text detected on this page. Scanned PDFs need OCR.')}catch(err){message('Direct text editing unavailable: '+err.message)}}
$('directEdit').onclick=async()=>{finishEditing();s.directMode=!s.directMode;c.selection=!s.directMode;c.skipTargetFind=s.directMode;c.discardActiveObject();c.requestRenderAll();$('directEdit').classList.toggle('active',s.directMode);await refreshDirectText();if(!s.directMode)message('Direct text editing off.')};

$('nativeText').onclick=async()=>{
 if(!s.file||!page()||page().source===null)return message('Open a PDF with selectable text first.');
 try{
  message('Finding original text on this page...');
  const fd=new FormData();fd.append('file',s.file);fd.append('page',String(page().source));
  const response=await fetch('/api/text',{method:'POST',body:fd});const result=await response.json();
  if(!response.ok)throw Error(result.error||'Text detection failed');
  if(result.rotation)throw Error('Native editing on rotated pages is not yet supported.');
  const spans=result.spans;
  if(!spans.length)return message('No editable text spans detected. Scans require OCR.');
  const query=prompt('Enter some original text to find on this page:');if(!query)return;
  const matches=spans.filter(x=>x.text.toLowerCase().includes(query.toLowerCase()));
  if(!matches.length)return message('No matching original text found.');
  const choice=matches.length===1?0:Number(prompt('Matching text spans (choose number):\n'+matches.slice(0,20).map((x,i)=>`${i+1}. ${x.text.slice(0,90)}`).join('\n'),'1'))-1;
  if(!Number.isInteger(choice)||choice<0||choice>=matches.length)return;
  const target=matches[choice];const replacement=prompt('Replace the entire text span with:',target.text);
  if(replacement===null)return;
  if(!confirm('This will permanently remove the selected original text in the EXPORTED PDF and replace it using Helvetica. White fill may affect complex backgrounds. Continue?'))return;
  rememberNativeEdit();s.nativeEdits.push({page:page().source,rect:target.rect,value:replacement,size:target.size,color:target.color});s.previewVersion++;syncPreview();
  message(`${s.nativeEdits.length} permanent text replacement(s) queued. Download PDF to apply. Original uploaded file is unchanged.`);
 }catch(e){console.error(e);message('Native text editing unavailable: '+e.message+' — run python server.py, not http.server.');}
};

$('replaceText').onclick=async()=>{
 if(!page()||page().source===null)return message('Open a text-based PDF to use text replacement.');
 try{
  const pg=await s.pdf.getPage(page().source+1),tc=await pg.getTextContent(),items=tc.items.filter(x=>x.str&&x.str.trim());
  if(!items.length)return message('No selectable text detected. Scanned PDFs require OCR (not included).');
  const query=prompt('Find original PDF text (exact substring):');if(!query)return;
  const matches=items.filter(x=>x.str.includes(query));if(!matches.length)return message('Text not found on this page. Try a shorter exact phrase.');
  if(matches.length>1&&!confirm(`${matches.length} text segments matched. Replace the first match?`))return;
  const it=matches[0],replacement=prompt('Replacement text:',it.str);if(replacement===null)return;
  const [a,b,cc,d,e,f]=it.transform;const size=Math.max(6,Math.hypot(cc,d));
  const top=page().height-f-size*.88, left=e, width=Math.max(12,it.width||replacement.length*size*.5);
  // This is a visible cover-and-replace annotation, NOT native modification of PDF text streams.
  const cover=new fabric.Rect({left:left-1,top:top-2,width:width+3,height:size*1.3,fill:'#ffffff',strokeWidth:0,selectable:true});
  const text=new fabric.Textbox(replacement,{left,top,width:Math.max(width+10,100),fontSize:size,fill:'#111111',fontFamily:'Arial'});
  c.add(cover);c.add(text);c.setActiveObject(text);c.requestRenderAll();message('Replacement overlay added. Check alignment and background before export. Original PDF text remains underneath.');
 }catch(err){console.error(err);message('Text detection failed: '+err.message)}
};
$('copy').onclick=()=>{const o=c.getActiveObject();if(!o)return;const clone=o.toObject();fabric.util.enlivenObjects([clone],objects=>{const x=objects[0];x.set({left:(o.left||0)+20,top:(o.top||0)+20});add(x)})};
$('front').onclick=()=>{const o=c.getActiveObject();if(o){c.bringToFront(o);c.requestRenderAll();save()}};
$('back').onclick=()=>{const o=c.getActiveObject();if(o){c.sendToBack(o);c.requestRenderAll();save()}};
$('del').onclick=()=>{c.getActiveObjects().forEach(o=>c.remove(o));c.discardActiveObject().renderAll()};async function restore(json){s.loading=true;await new Promise(resolve=>c.loadFromJSON(JSON.parse(json),resolve));c.renderAll();page().objects=snapshot();s.loading=false}$('undo').onclick=async()=>{if(nativeUndo())return;if(s.history.length<2)return;s.future.push(s.history.pop());await restore(s.history.at(-1))};$('redo').onclick=async()=>{if(nativeRedo())return;if(!s.future.length)return;const x=s.future.pop();s.history.push(x);await restore(x)};
$('add').onclick=async()=>{if(!page())return;persist();s.pages.push({source:null,width:595,height:842,objects:{objects:[]}});s.i=s.pages.length-1;await render()};$('duplicate').onclick=async()=>{if(!page())return;persist();s.pages.splice(s.i+1,0,{...page(),objects:JSON.parse(JSON.stringify(page().objects))});s.i++;await render()};$('remove').onclick=async()=>{if(s.pages.length<=1)return message('At least one page required.');s.pages.splice(s.i,1);s.i=Math.min(s.i,s.pages.length-1);await render()};$('prev').onclick=()=>go(s.i-1);$('next').onclick=()=>go(s.i+1);$('plus').onclick=async()=>{if(!page())return;persist();s.zoom=Math.min(2,s.zoom+.1);await render()};$('minus').onclick=async()=>{if(!page())return;persist();s.zoom=Math.max(.4,s.zoom-.1);await render()};
$('export').onclick=async()=>{finishEditing();if(!page())return message('Upload a PDF first.');try{persist();message('Exporting...');let original=null;
if(s.file){
 let sourceBytes=await s.file.arrayBuffer();
 if(s.nativeEdits.length){
  const fd=new FormData();fd.append('file',s.file);fd.append('edits',JSON.stringify(s.nativeEdits));
  const response=await fetch('/api/apply',{method:'POST',body:fd});
  if(!response.ok){let err;try{err=(await response.json()).error}catch{}throw Error(err||'Native text edit failed. Run python server.py.');}
  sourceBytes=await response.arrayBuffer();
 }
 original=await PDFDocument.load(sourceBytes);
}
const out=await PDFDocument.create();for(const p of s.pages){let dest;if(p.source!==null){const [copy]=await out.copyPages(original,[p.source]);out.addPage(copy);dest=copy}else dest=out.addPage([p.width,p.height]);if(p.objects?.objects?.length){const temp=new fabric.StaticCanvas(null,{width:p.width,height:p.height,backgroundColor:'transparent'});await new Promise(resolve=>temp.loadFromJSON(p.objects,resolve));temp.backgroundColor='rgba(0,0,0,0)';temp.renderAll();const data=temp.toDataURL({format:'png',multiplier:2});const bytes=await fetch(data).then(r=>r.arrayBuffer()),img=await out.embedPng(bytes);dest.drawImage(img,{x:0,y:0,width:dest.getWidth(),height:dest.getHeight()});temp.dispose()}}const bytes=await out.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=(s.file?s.file.name.replace(/\.pdf$/i,''):'untitled')+'-edited.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);message('PDF exported.')}catch(err){console.error(err);message('Export error: '+err.message)}};
window.addEventListener('keydown',e=>{if(c.getActiveObject()?.isEditing||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const selected=c.getActiveObject();if(selected&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;selected.set({left:(selected.left||0)+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),top:(selected.top||0)+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)});selected.setCoords();c.requestRenderAll();save();return;}if(e.key==='Delete')$('del').click();if((e.ctrlKey||e.metaKey)&&e.key==='d'){e.preventDefault();$('copy').click()}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('export').click()}if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click()}if((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();$('redo').click()}});

// Page ordering shortcuts; selected page can move without drag and drop.
async function movePage(delta){if(!page())return;const j=s.i+delta;if(j<0||j>=s.pages.length)return;persist();const [item]=s.pages.splice(s.i,1);s.pages.splice(j,0,item);s.i=j;await render();message('Page moved.');}
$('moveUp').onclick=()=>movePage(-1);$('moveDown').onclick=()=>movePage(1);
$('fit').onclick=async()=>{if(!page())return;persist();s.zoom=1;await render()};
$('clear').onclick=()=>{if(!page())return; if(!confirm('Remove all added elements from this page?'))return;c.getObjects().slice().forEach(o=>c.remove(o));message('Page annotations cleared.')};

// Phase 5: precision controls, drawing and optional snap-to-grid.
$('draw').onclick=()=>{drawMode=!drawMode;c.isDrawingMode=drawMode;c.freeDrawingBrush.color=$('ink').value;c.freeDrawingBrush.width=Number($('brush').value);$('draw').classList.toggle('primary',drawMode);message(drawMode?'Drawing mode: drag on the page to draw. Click Draw again to select objects.':'Selection mode.');};
$('ink').onchange=()=>{c.freeDrawingBrush.color=$('ink').value};
$('brush').onchange=()=>{c.freeDrawingBrush.width=Number($('brush').value)};
$('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('primary',showGrid);message(showGrid?'Snap to 10-point grid enabled.':'Snap to grid disabled.');};
c.on('object:moving',e=>{if(showGrid&&e.target){e.target.set({left:Math.round(e.target.left/gridSize)*gridSize,top:Math.round(e.target.top/gridSize)*gridSize});}});
$('centerH').onclick=()=>{const o=c.getActiveObject();if(!o)return;o.set('left',(page().width-o.getScaledWidth())/2);o.setCoords();c.requestRenderAll();save();};
$('centerV').onclick=()=>{const o=c.getActiveObject();if(!o)return;o.set('top',(page().height-o.getScaledHeight())/2);o.setCoords();c.requestRenderAll();save();};
$('actual').onclick=async()=>{if(!page())return;persist();s.zoom=1;await render();};


// Phase 10: browser-local project recovery. Stored only on this browser/device.
const RECOVERY_DB='pdf-studio-recovery-v1';
function recoveryDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(RECOVERY_DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('projects'))request.result.createObjectStore('projects')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function projectStore(mode,record){const db=await recoveryDb();return new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode);const req=mode==='readonly'?tx.objectStore('projects').get('current'):tx.objectStore('projects').put(record,'current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
async function clearRecovery(){const db=await recoveryDb();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');const req=tx.objectStore('projects').delete('current');req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
let recovering=false,savingRecovery=false,lastRecoveryKey='';
async function saveRecovery(force=false){
 if(recovering||savingRecovery||!s.pages.length||s.loading||s.editing)return;
 persist();
 const record={savedAt:Date.now(),file:s.file||null,pages:s.pages.map(p=>({source:p.source,width:p.width,height:p.height,objects:p.objects})),i:s.i,zoom:s.zoom,nativeEdits:JSON.parse(JSON.stringify(s.nativeEdits)),name:$('name').textContent};
 const key=JSON.stringify({pages:record.pages,edits:record.nativeEdits,i:record.i,name:record.name});
 if(!force&&key===lastRecoveryKey)return;
 savingRecovery=true;
 try{await projectStore('readwrite',record);lastRecoveryKey=key;$('recoveryStatus').textContent='Saved locally '+new Date().toLocaleTimeString();}
 catch(err){console.error('Recovery save failed',err);$('recoveryStatus').textContent='Local save failed';}
 finally{savingRecovery=false;}
}
async function restoreRecovery(){
 let record;try{record=await projectStore('readonly')}catch(err){return message('Could not access local recovery: '+err.message)}
 if(!record)return message('No saved project found on this browser.');
 if(!confirm('Restore your saved PDFDR project? Unsaved changes in the current editor will be replaced.'))return;
 recovering=true;
 try{
  if(record.file){await openDocument(record.file);if(!s.pdf)throw Error('Could not reopen the stored PDF')}
  else{$('blank').click();await new Promise(resolve=>setTimeout(resolve,200));}
  s.pages=record.pages;s.i=Math.max(0,Math.min(record.i||0,s.pages.length-1));s.zoom=record.zoom||1;s.nativeEdits=record.nativeEdits||[];
  s.nativeUndo=[];s.nativeRedo=[];s.previewPdf=null;s.previewApplied=-1;s.previewVersion++;
  $('name').textContent=record.name||'Recovered PDF';await render();
  if(s.file&&s.nativeEdits.length)await syncPreview();
  $('recoveryStatus').textContent='Restored '+new Date(record.savedAt).toLocaleString();
  message('Recovered your local editing session. Download PDF to save the final document.');
 }catch(err){console.error(err);message('Recovery failed: '+err.message)}finally{recovering=false;lastRecoveryKey='';}
}
$('saveProject').onclick=()=>saveRecovery(true);
$('restoreProject').onclick=restoreRecovery;
$('clearProject').onclick=async()=>{if(!confirm('Delete the locally saved recovery copy? This does not delete your current PDF.'))return;try{await clearRecovery();lastRecoveryKey='';$('recoveryStatus').textContent='Recovery cleared'}catch(e){message('Could not clear recovery: '+e.message)}};
setInterval(()=>saveRecovery(),12000);
window.addEventListener('pagehide',()=>{if(!s.loading)saveRecovery()});
(async()=>{try{const record=await projectStore('readonly');if(record)$('recoveryStatus').textContent='Saved project available: '+new Date(record.savedAt).toLocaleString()}catch(e){console.warn(e)}})();
