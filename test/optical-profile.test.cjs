'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const optics=require('../experiments/liquid-glass-optics/optical-profile.js');
const config={width:240,height:68,radius:30,depth:20,refraction:24,chromatic:0.18,edgeWidth:1};

test('rounded rectangle signed distance is interior at centre, exterior at corner',()=>{
  assert.ok(optics.roundedRectSdf(120,34,240,68,30)<0);
  assert.ok(optics.roundedRectSdf(0,0,240,68,30)>0);
});
test('center of lens stays visually sharp with near zero chromatic shift',()=>{
  const p=optics.sample(120,34,config);
  assert.ok(p);
  assert.ok(Math.abs(p.shiftX)<1e-8);
  assert.ok(Math.abs(p.shiftY)<1e-8);
  assert.ok(Math.abs(p.colorX)<1e-8);
  assert.ok(Math.abs(p.colorY)<1e-8);
});
test('edge is more refractive and has localized chromatic color split',()=>{
  const outer=optics.sample(4,34,config),inner=optics.sample(50,34,config);
  assert.ok(outer&&inner);
  assert.ok(Math.abs(outer.shiftX)>Math.abs(inner.shiftX));
  assert.ok(Math.abs(outer.colorX)>Math.abs(inner.colorX));
});
test('symmetric opposite edges refract in opposite directions',()=>{
  const left=optics.sample(4,34,config),right=optics.sample(236,34,config);
  assert.ok(Math.abs(left.shiftX+right.shiftX)<1e-6);
  assert.ok(Math.abs(left.colorX+right.colorX)<1e-6);
});
test('zero refraction and chromatic settings cancel displacements',()=>{
  const p=optics.sample(4,34,{...config,refraction:0,chromatic:0});
  assert.equal(p.shiftX,0);assert.equal(p.shiftY,0);assert.equal(p.colorX,0);assert.equal(p.colorY,0);
});
test('outside pixels do not receive the lens effect',()=>{
  assert.equal(optics.sample(-2,34,config),null);
  assert.equal(optics.sample(0,0,config),null);
});
test('rounded corners and very small elements are finite',()=>{
  for(const [w,h] of [[3,3],[30,12],[80,20]])for(let x=0;x<=w;x+=1.5){
    const p=optics.sample(x,h/2,{...config,width:w,height:h});
    if(p)for(const n of Object.values(p))assert.ok(Number.isFinite(n));
  }
});
