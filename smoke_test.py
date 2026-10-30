"""Run while server.py is listening at http://127.0.0.1:5500."""
import io, json, urllib.request, uuid
import pymupdf

BASE='http://127.0.0.1:5500'
doc=pymupdf.open(); page=doc.new_page(); page.insert_text((72,72),'Original Sample',fontsize=12); original=doc.tobytes(); doc.close()

def post(path, fields):
    boundary='----pdfstudio'+uuid.uuid4().hex
    body=bytearray()
    for key,(filename,value,content_type) in fields.items():
        body.extend(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"'+('; filename="'+filename+'"' if filename else '')+'\r\nContent-Type: '+content_type+'\r\n\r\n').encode())
        body.extend(value);body.extend(b'\r\n')
    body.extend(('--'+boundary+'--\r\n').encode())
    req=urllib.request.Request(BASE+path,data=bytes(body),headers={'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
    with urllib.request.urlopen(req,timeout=20) as res:return res.read()

fields={'file':('sample.pdf',original,'application/pdf'),'page':(None,b'0','text/plain')}
spans=json.loads(post('/api/text',fields))['spans']
assert any('Original Sample' in s['text'] for s in spans),spans
span=next(s for s in spans if 'Original Sample' in s['text'])
edit=[{'page':0,'rect':span['rect'],'value':'Updated Sample','size':span['size'],'color':span['color'],'font':span['font']}]
result=post('/api/apply',{'file':('sample.pdf',original,'application/pdf'),'edits':(None,json.dumps(edit).encode(),'application/json')})
with pymupdf.open(stream=result,filetype='pdf') as edited:
    text=edited[0].get_text()
    assert 'Updated Sample' in text,text
    assert 'Original Sample' not in text,text
print('PASS: text detection and permanent replacement export')
