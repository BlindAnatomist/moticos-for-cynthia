import {it,expect} from 'vitest';
import {verifyPng} from '../scripts/expansion160Png.mjs';
import {deflateSync} from 'node:zlib';
import {makePng,appendIdatPayload} from './expansion160PngFixtures.js';
it('decodes complete native PNG stream',()=>expect(verifyPng(makePng(20,30),[20,30])).toEqual({width:20,height:30,decodedBytes:2430}));
it.each(['truncated','wrong-size','CRC','trailing','header-only'])('rejects misleading PNG %s',mode=>{let b=makePng(20,30),d=[20,30];if(mode==='truncated')b=b.subarray(0,b.length-4);if(mode==='wrong-size')d=[20,31];if(mode==='CRC')b[40]^=1;if(mode==='trailing')b=Buffer.concat([b,Buffer.from('junk')]);if(mode==='header-only')b=b.subarray(0,24);expect(()=>verifyPng(b,d)).toThrow();});

it.each(['junk','second-zlib-stream'])('rejects CRC-correct trailing IDAT %s',mode=>{const tail=mode==='junk'?Buffer.from('CRC-correct junk after zlib stream'):deflateSync(Buffer.from('second stream'));const bytes=appendIdatPayload(makePng(20,30),tail);expect(()=>verifyPng(bytes,[20,30])).toThrow('Trailing bytes after PNG zlib stream');});
