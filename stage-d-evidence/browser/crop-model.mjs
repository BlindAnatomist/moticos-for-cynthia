import assert from 'node:assert/strict';

// Match the authored integer client-size fit, then the independent containing
// content box's CSS max-width/max-height constraints. Never derive expected
// geometry from the measured inner frame or image.
export function cropGeometryModel({source,crop,client,content,dpr}){
  assert(source.length===2&&crop.length===4&&client.length===2&&content.length===2);
  assert([...source,...crop,...client,...content,dpr].every(Number.isFinite));
  const [sw,sh]=source,[x,y,cw,ch]=crop;
  assert(source.every(v=>Number.isInteger(v)&&v>0)&&crop.every(Number.isInteger));
  assert(x>=0&&y>=0&&cw>0&&ch>0&&x+cw<=sw&&y+ch<=sh);
  assert(client.every(v=>Number.isInteger(v)&&v>0)&&content.every(v=>v>0)&&dpr>0);
  const scale=Math.min(client[0]/cw,client[1]/ch),idealFrame=[cw*scale,ch*scale];
  const frame=[Math.min(idealFrame[0],content[0]),Math.min(idealFrame[1],content[1])];
  const ideal=[...idealFrame,sw*scale,sh*scale,-x*scale,-y*scale];
  const expected=[...frame,sw*frame[0]/cw,sh*frame[1]/ch,-x*frame[0]/cw,-y*frame[1]/ch];
  return{scale,ideal,expected,clamp:idealFrame.map((v,i)=>v-frame[i]),modeledIdealDeviationPhysicalPixels:expected.map((v,i)=>Math.abs(v-ideal[i])*dpr)};
}
export function cropGeometryResidual(row){const model=cropGeometryModel(row);assert(row.actual.length===6&&row.actual.every(Number.isFinite));const errors=row.actual.map((v,i)=>Math.abs(v-model.expected[i]));return{...model,errors,residualPhysicalPixels:errors.map(v=>v*row.dpr),observedIdealDeviationPhysicalPixels:row.actual.map((v,i)=>Math.abs(v-model.ideal[i])*row.dpr)};}

export function verifyCropStyle(styles){
  for(const name of ['outer','inner']){
    const style=styles[name];
    assert.equal(style.transform,'none',`${name} transform is outside this model`);
    for(const key of ['paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'])assert.equal(style[key],0,`${name} ${key} must remain zero`);
  }
  assert.equal(styles.inner.maxWidth,'100%');assert.equal(styles.inner.maxHeight,'100%');
  assert.equal(styles.image.transform,'none');
  assert.equal(styles.image.position,'absolute');assert.equal(styles.image.maxWidth,'none');
}
export function verifyCropResidual(row){
  verifyCropStyle(row.styles);
  const result=cropGeometryResidual(row);
  assert(Math.max(...result.errors)<=0.125,'Crop geometry differs from the independently clamped CSS model');
  assert(Math.max(...result.residualPhysicalPixels)<=1,'Crop model residual exceeds one physical pixel');
  return result;
}
