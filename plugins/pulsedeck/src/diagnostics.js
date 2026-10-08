// Diagnostic storage and emitted messages are capped in UTF-8 bytes, not UTF-16.
export function diagnostic(value, limit = 2048) {
  const text=String(value).slice(-8192)
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g,'')
    .replace(/(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]/g,'')
    .replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g,' ');
  let bytes=0,start=text.length;
  while(start>0){let index=start-1;const low=text.charCodeAt(index);if(low>=0xdc00&&low<=0xdfff&&index>0){const high=text.charCodeAt(index-1);if(high>=0xd800&&high<=0xdbff)index--;}
    const cp=text.codePointAt(index);const size=cp<=0x7f?1:cp<=0x7ff?2:cp<=0xffff?3:4;if(bytes+size>limit)break;bytes+=size;start=index;
  }
  return text.slice(start);
}
export function diagnosticMessage(prefix, detail) {
  const clean=diagnostic(prefix,256);
  // Prefixes are application-owned ASCII; reserve their UTF-8 budget.
  let bytes=0;for(const c of clean){const cp=c.codePointAt(0);bytes+=cp<=127?1:cp<=2047?2:cp<=65535?3:4;}
  return clean+diagnostic(detail,2048-bytes);
}
