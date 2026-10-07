import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const value of bytes)crc=crcTable[(crc^value)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
// Validate the complete native non-interlaced PNG stream, including every CRC,
// IDAT byte, decompression bound and scanline. This is readability, not art QA.
export function verifyPng(bytes,dimensions) {
 assert(bytes.length>=57);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let offset=8,width,height,depth,color,ended=false,seenData=false,closedData=false,palette=false;const chunks=[];
 while(offset<bytes.length){assert(offset+12<=bytes.length);const length=bytes.readUInt32BE(offset),end=offset+12+length;assert(end<=bytes.length);const kind=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+length);assert.match(kind,/^[A-Za-z]{4}$/);assert.equal(crc32(bytes.subarray(offset+4,offset+8+length)),bytes.readUInt32BE(offset+8+length),'PNG CRC mismatch');
  if(offset===8){assert.equal(kind,'IHDR');assert.equal(length,13);width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];color=data[9];assert.deepEqual([width,height],dimensions);assert.equal(data[10],0);assert.equal(data[11],0);assert.equal(data[12],0,'Native export unexpectedly interlaced');assert([0,2,3,4,6].includes(color));assert(([0,3].includes(color)?[1,2,4,8,...(color===0?[16]:[])]:[8,16]).includes(depth));}
  else assert.notEqual(kind,'IHDR');
  if(kind==='PLTE'){assert(!seenData);assert(length>0&&length%3===0&&length<=768);palette=true;}
  if(kind==='IDAT'){assert(!closedData);seenData=true;chunks.push(data);}else if(seenData)closedData=true;
  if(kind==='IEND'){assert.equal(length,0);assert(seenData);assert.equal(end,bytes.length);ended=true;}
  if(kind[0]===kind[0].toUpperCase())assert(['IHDR','PLTE','IDAT','IEND'].includes(kind),'Unknown critical PNG chunk');
  offset=end;
 }
 assert(ended);if(color===3)assert(palette);
 const channels={0:1,2:3,3:1,4:2,6:4}[color],rowBytes=Math.ceil(width*channels*depth/8),expected=(rowBytes+1)*height;
 assert(expected>0&&expected<=64*1024*1024,'Unexpected image decode allocation');
 const compressed=Buffer.concat(chunks),inflated=inflateSync(compressed,{maxOutputLength:expected,info:true});
 assert.equal(inflated.engine.bytesWritten,compressed.length,'Trailing bytes after PNG zlib stream');
 const pixels=inflated.buffer;assert.equal(pixels.length,expected);
 for(let row=0;row<height;row++)assert(pixels[row*(rowBytes+1)]<=4,'Invalid PNG scanline filter');
 return {width,height,decodedBytes:expected};
}
