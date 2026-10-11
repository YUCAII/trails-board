"""Repackage the supplied WebView shell, then sign with Android's apksigner."""
import argparse
import datetime
import hashlib
import json
import pathlib
import struct
import subprocess
import zipfile
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from build_web import build

ROOT = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = 'com.trails.board.multilang'

def chunks(data, start):
    while start < len(data):
        kind, header, size = struct.unpack_from('<HHI',data,start)
        assert size >= header >= 8 and start+size <= len(data)
        yield start, kind, header, data[start:start+size]
        start += size

def pool_strings(pool):
    count, styles, flags, strings_start, styles_start = struct.unpack_from('<IIIII',pool,8)
    assert styles == 0, 'Styled resource string pools require separate handling'
    utf8 = bool(flags & 0x100)
    result=[]
    def length(pos, byte):
        if byte:
            first=pool[pos]
            return (((first&0x7f)<<8)|pool[pos+1],pos+2) if first&0x80 else (first,pos+1)
        first=struct.unpack_from('<H',pool,pos)[0]
        return (((first&0x7fff)<<16)|struct.unpack_from('<H',pool,pos+2)[0],pos+4) if first&0x8000 else (first,pos+2)
    for i in range(count):
        pos = strings_start + struct.unpack_from('<I',pool,28+i*4)[0]
        n,pos=length(pos,utf8)
        if utf8:
            n,pos=length(pos,True)
            result.append(pool[pos:pos+n].decode('utf-8'))
        else:
            result.append(pool[pos:pos+n*2].decode('utf-16-le'))
    return result, utf8, flags

def make_pool(pool, replacements):
    strings, utf8, flags = pool_strings(pool)
    offsets, body=[], bytearray()
    def length(n, byte):
        if byte:
            assert n <= 0x7fff
            return bytes([n]) if n<128 else bytes([(n>>8)|0x80,n&255])
        return struct.pack('<H',n) if n<0x8000 else struct.pack('<HH',(n>>16)|0x8000,n&0xffff)
    for original in strings:
        value=replacements.get(original,original)
        offsets.append(len(body))
        if utf8:
            encoded=value.encode('utf-8')
            body += length(len(value.encode('utf-16-le'))//2,True)+length(len(encoded),True)+encoded+b'\0'
        else:
            encoded=value.encode('utf-16-le')
            body += length(len(encoded)//2,False)+encoded+b'\0\0'
    start=28+len(strings)*4
    body += b'\0'*((-len(body))%4)
    # Replacing strings can change lexical ordering; clear the SORTED flag.
    return struct.pack('<HHI',1,28,start+len(body))+struct.pack('<IIIII',len(strings),0,flags&~1,start,0)+struct.pack('<'+'I'*len(offsets),*offsets)+body

def patch_manifest(data):
    header=struct.unpack_from('<H',data,2)[0]
    strings=[]
    parts=[]
    for offset, kind, chunk_header, chunk in chunks(data,header):
        if kind==1:
            strings=pool_strings(chunk)[0]
            chunk=make_pool(chunk,{'com.trails.board':PACKAGE,'.MainActivity':'com.trails.board.MainActivity','9.0':'10.0'})
        elif kind==0x0102:
            chunk=bytearray(chunk)
            attr_start, attr_size, count=struct.unpack_from('<HHH',chunk,chunk_header+8)
            for i in range(count):
                pos=chunk_header+attr_start+i*attr_size
                name=strings[struct.unpack_from('<I',chunk,pos+4)[0]]
                if name=='versionCode':
                    struct.pack_into('<I',chunk,pos+16,10)
            chunk=bytes(chunk)
        parts.append(chunk)
    output=bytearray(data[:header]+b''.join(parts))
    struct.pack_into('<I',output,4,len(output))
    return bytes(output)

def patch_resources(data):
    header=struct.unpack_from('<H',data,2)[0]
    parts=[]
    for offset,kind,chunk_header,chunk in chunks(data,header):
        if kind==1:
            chunk=make_pool(chunk,{'空之轨迹1st攻略板':'Trails Board'})
        parts.append(chunk)
    output=bytearray(data[:header]+b''.join(parts))
    struct.pack_into('<I',output,4,len(output))
    return bytes(output)

def signing_material():
    folder=ROOT/'.private-signing'
    folder.mkdir(exist_ok=True)
    key_path, cert_path=folder/'trails-board.pk8',folder/'trails-board.x509.pem'
    if not key_path.exists() and not cert_path.exists():
        key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Trails Board'),x509.NameAttribute(NameOID.ORGANIZATION_NAME,'YUCAII')])
        now=datetime.datetime.now(datetime.timezone.utc)
        cert=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
              .serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(days=1))
              .not_valid_after(now+datetime.timedelta(days=365*30)).sign(key,hashes.SHA256()))
        key_path.write_bytes(key.private_bytes(serialization.Encoding.DER,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    assert key_path.exists() and cert_path.exists(),'Incomplete signing key pair; do not silently replace it'
    return key_path,cert_path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--original-apk',type=pathlib.Path)
    parser.add_argument('--java',type=pathlib.Path,required=True)
    parser.add_argument('--apksigner',type=pathlib.Path,required=True)
    args=parser.parse_args()
    build()
    template=ROOT/'android-template'
    if args.original_apk:
        template.mkdir(exist_ok=True)
        with zipfile.ZipFile(args.original_apk) as archive:
            for info in archive.infolist():
                if info.filename.startswith('META-INF/') or info.filename=='assets/index.html':
                    continue
                target=template/info.filename
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(archive.read(info))
    assert (template/'classes.dex').exists(),'Supply the original APK once to extract the shell template'
    dist=ROOT/'dist'
    dist.mkdir(exist_ok=True)
    unsigned=dist/'trails_board_v10_unsigned.apk'
    output=dist/'trails_board_v10_multilang.apk'
    with zipfile.ZipFile(unsigned,'w') as archive:
        for path in sorted(template.rglob('*')):
            if not path.is_file():continue
            name=path.relative_to(template).as_posix()
            payload=path.read_bytes()
            if name=='AndroidManifest.xml':payload=patch_manifest(payload)
            elif name=='resources.arsc':payload=patch_resources(payload)
            info=zipfile.ZipInfo(name,(2026,10,11,0,0,0))
            info.compress_type=zipfile.ZIP_STORED if name=='resources.arsc' or name.startswith('res/') else zipfile.ZIP_DEFLATED
            if info.compress_type==zipfile.ZIP_STORED:
                pos=archive.fp.tell()+30+len(name.encode('utf-8'))
                if pos%4:
                    padding=(-(pos+4))%4
                    info.extra=struct.pack('<HH',0xd935,padding)+b'\0'*padding
            archive.writestr(info,payload)
        archive.write(ROOT/'app/index.html','assets/index.html',compress_type=zipfile.ZIP_DEFLATED)
    key,cert=signing_material()
    cmd=[str(args.java),'-jar',str(args.apksigner)]
    subprocess.run(cmd+['sign','--key',str(key),'--cert',str(cert),'--v1-signing-enabled','true',
                       '--v2-signing-enabled','true','--v3-signing-enabled','false','--out',str(output),str(unsigned)],check=True)
    result=subprocess.run(cmd+['verify','--verbose','--print-certs',str(output)],check=True,capture_output=True,text=True)
    (dist/'APK_VERIFICATION.txt').write_text(result.stdout,encoding='utf-8')
    checksum=hashlib.sha256(output.read_bytes()).hexdigest()
    (dist/'SHA256SUMS.txt').write_text(f'{checksum}  {output.name}\n',encoding='utf-8')
    (dist/'release-metadata.json').write_text(json.dumps({'package':PACKAGE,'versionName':'10.0','versionCode':10,
      'languages':['zh-CN','en','ja'],'sha256':checksum,'bytes':output.stat().st_size,
      'quests':87,'inGameAchievements':178,'steamAchievements':43,'translatedStrings':1560},indent=2)+'\n',encoding='utf-8')
    print(result.stdout)
    print('Built',output.name,output.stat().st_size,'bytes; SHA256',checksum)

if __name__=='__main__':main()
