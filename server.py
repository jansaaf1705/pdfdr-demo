"""Local PDFDR server. Install: python -m pip install pymupdf"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import math
import traceback
import os
import pymupdf as fitz

ROOT = Path(__file__).resolve().parent
MAX_FILE = 35 * 1024 * 1024

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_json(self, obj, status=200):
        data=json.dumps(obj).encode()
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

    def do_GET(self):
        from urllib.parse import urlsplit, unquote
        path = unquote(urlsplit(self.path).path)
        allowed = path in ('/', '/index.html', '/site.css', '/favicon.svg', '/robots.txt') or any(
            path == '/' + x or path == '/' + x + '/' or path == '/' + x + '/index.html'
            for x in ('about', 'contact', 'privacy', 'terms', 'editor')
        ) or path in ('/editor/editor.js', '/editor/phase15.js')
        if not allowed:
            self.send_error(404, 'Not found')
            return
        return super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/text','/api/apply'):
            return self.send_json({'error':'Not found'},404)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>MAX_FILE+200000: return self.send_json({'error':'File too large (35 MB limit)'},413)
            data=self.rfile.read(size)
            import email
            raw=b'Content-Type: '+self.headers.get('Content-Type','').encode()+b'\r\nMIME-Version: 1.0\r\n\r\n'+data
            msg=email.message_from_bytes(raw)
            fields={}
            for part in msg.walk():
                name=part.get_param('name',header='content-disposition')
                if name: fields[name]=part.get_payload(decode=True)
            source=fields.get('file')
            if not source or len(source)>MAX_FILE:return self.send_json({'error':'Missing PDF or exceeds 35 MB'},400)
            if not source.lstrip().startswith(b'%PDF-'):
                return self.send_json({'error':'The uploaded file is not a valid PDF.'},400)
            doc=fitz.open(stream=source,filetype='pdf')
            if len(doc)>500:
                return self.send_json({'error':'PDF exceeds the 500-page limit.'},400)
            if doc.needs_pass:return self.send_json({'error':'Password-protected PDFs are not supported'},400)
            if self.path=='/api/text':
                p=int(fields.get('page',b'0'))
                if p<0 or p>=len(doc):raise ValueError('Invalid page')
                pg=doc[p]
                spans=[]
                for block in pg.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        for sp in line.get('spans',[]):
                            if sp['text'].strip():
                                spans.append({'text':sp['text'],'rect':list(sp['bbox']),'size':sp['size'],'font':sp['font'],'color':sp['color']})
                return self.send_json({'spans':spans,'rotation':pg.rotation})
            edits=json.loads(fields.get('edits',b'[]'))
            if not isinstance(edits,list) or len(edits)>200:
                return self.send_json({'error':'Invalid replacements or too many replacements'},400)
            replacements=[]
            for item in edits:
                p=int(item['page'])
                if p<0 or p>=len(doc): raise ValueError('Invalid page index')
                pg=doc[p]
                if pg.rotation: raise ValueError('Rotated pages are not supported for native text replacement')
                rect=fitz.Rect(item['rect'])
                if not all(math.isfinite(v) for v in (rect.x0, rect.y0, rect.x1, rect.y1)) or rect.is_empty: raise ValueError('Invalid text region')
                # Font bounding boxes can extend just outside the visible page.
                rect=rect & pg.rect
                if rect.is_empty: raise ValueError('Text region is outside the page')
                value=str(item.get('value',''))
                if len(value)>1000: raise ValueError('Replacement too long')
                if any(ord(ch)<32 and ch not in ('\n','\t','\r') for ch in value): raise ValueError('Replacement contains unsupported control characters')
                color=int(item.get('color',0))
                if not (0<=color<=0xFFFFFF): raise ValueError('Invalid text color')
                fontsize=float(item.get('size',11))
                if not math.isfinite(fontsize): raise ValueError('Invalid font size')
                fontsize=min(80,max(4,fontsize))
                font_hint=str(item.get('font','')).lower()
                family=('cour' if 'courier' in font_hint or 'mono' in font_hint else 'tiro' if any(x in font_hint for x in ('times','serif','georgia','garamond')) else 'helv')
                bold=bool(item.get('bold', 'bold' in font_hint))
                italic=bool(item.get('italic', any(x in font_hint for x in ('italic','oblique'))))
                fonts={'helv':('helv','hebo','heit','hebi'),'cour':('cour','cobo','coit','cobi'),'tiro':('tiro','tibo','tiit','tibi')}
                fontname=fonts[family][int(bold)+2*int(italic)]
                align=str(item.get('align','left')).lower()
                if align not in ('left','center','right'): raise ValueError('Invalid text alignment')
                replacements.append((p,rect,value,color,fontsize,fontname,align))
                pg.add_redact_annot(rect,fill=(1,1,1))
            for p in sorted({e[0] for e in replacements}):
                doc[p].apply_redactions(images=0,graphics=0,text=0)
            for p,rect,value,color,fontsize,fontname,align in replacements:
                # An empty value means erase the text permanently.
                if not value: continue
                pg=doc[p]
                rgb=((color>>16&255)/255,(color>>8&255)/255,(color&255)/255)
                # Use a generously sized rectangle; allow font shrink for long edits.
                area=fitz.Rect(max(pg.rect.x0,rect.x0),max(pg.rect.y0,rect.y0-2),pg.rect.x1-2,min(pg.rect.y1,rect.y1+max(26,fontsize*(2.4+1.35*value.count('\n')))))
                if area.width<=4 or area.height<=4: raise ValueError('Replacement area is too small')
                # Dry-run text layout on a Shape before committing any drawing.
                # insert_textbox on the page can otherwise partially draw when the text does not fit.
                fitted=False
                trial_size=fontsize
                while trial_size>=4:
                    shape=pg.new_shape()
                    remaining=shape.insert_textbox(area,value,fontname=fontname,fontsize=trial_size,color=rgb,align={'left':0,'center':1,'right':2}[align])
                    if remaining>=0:
                        shape.commit(overlay=True)
                        fitted=True
                        break
                    trial_size-=0.5
                if not fitted: raise ValueError('Replacement does not fit: '+value[:35])
            result=doc.tobytes(garbage=4,deflate=True)
            self.send_response(200);self.send_header('Content-Type','application/pdf');self.send_header('Content-Length',str(len(result)));self.end_headers();self.wfile.write(result)
        except Exception as e:
            print('PDFDR API error:',repr(e),flush=True)
            self.send_json({'error':str(e)},400)

if __name__=='__main__':
    host=os.environ.get('PDFDR_HOST','127.0.0.1')
    port=int(os.environ.get('PDFDR_PORT','5500'))
    print(f'PDFDR: http://{host}:{port}',flush=True)
    ThreadingHTTPServer((host,port),Handler).serve_forever()
