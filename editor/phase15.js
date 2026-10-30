// Phase 15: UX enhancements layered on top of the existing Phase 14 editor.
// The PDF export and text editing engines are intentionally unchanged.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const work=$('work'),file=$('file'),status=$('status');
if(!work||!file)return;
let dragDepth=0;
function isPdf(f){return !!f && (f.type==='application/pdf'||/\.pdf$/i.test(f.name));}
function showMessage(t){if(status)status.textContent=t;}
function resetDrag(){dragDepth=0;work.classList.remove('drag-upload');}
work.addEventListener('dragenter',e=>{if(!e.dataTransfer?.types?.includes('Files'))return;e.preventDefault();dragDepth++;work.classList.add('drag-upload');});
work.addEventListener('dragover',e=>{if(!e.dataTransfer?.types?.includes('Files'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
work.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)resetDrag();});
work.addEventListener('drop',e=>{e.preventDefault();resetDrag();const f=[...(e.dataTransfer?.files||[])].find(isPdf);if(!f){showMessage('Please drop a PDF file.');return;}try{const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;file.dispatchEvent(new Event('change',{bubbles:true}));}catch(err){showMessage('Drag and drop unavailable in this browser. Use Open PDF.');}});
const fit=$('fitWidth15');if(fit)fit.addEventListener('click',()=>{
 const paper=$('paper');if(!paper||paper.hidden){showMessage('Open a PDF first.');return;}
 const available=Math.max(240,work.clientWidth-34),current=paper.getBoundingClientRect().width;
 const zoomText=$('zoom')?.textContent||'100%';const zoom=parseFloat(zoomText)/100||1;
 const target=Math.min(2,Math.max(.4,zoom*available/Math.max(1,current)));
 const plus=$('plus'),minus=$('minus');let n=0;
 const timer=setInterval(()=>{const z=parseFloat($('zoom')?.textContent||'100')/100;if(Math.abs(z-target)<.055||++n>20){clearInterval(timer);return;}(z<target?plus:minus)?.click();},110);
});
$('togglePages15')?.addEventListener('click',()=>{document.body.classList.remove('tools-open');document.body.classList.toggle('pages-open');});
// Prevent the browser opening a dropped PDF in a new tab when dropped outside the canvas.
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});
})();
