/* Experimental optical geometry (not the production Meapri renderer).
 * Mathematical study of edge-localized refraction and color dispersion.
 * No DOM access, no private content, and no external dependencies. */
(function init(root) {
  'use strict';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;

  function roundedRectSdf(x,y,width,height,radius) {
    const w=Math.max(1,finite(width,1)),h=Math.max(1,finite(height,1));
    const r=clamp(finite(radius,0),0,Math.min(w,h)*0.5);
    const qx=Math.abs(x-w*0.5)-w*0.5+r;
    const qy=Math.abs(y-h*0.5)-h*0.5+r;
    return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;
  }

  function bevelHeight(inside,depth) {
    const z=Math.max(0.001,finite(depth,12));
    const d=clamp(finite(inside,0),0,z);
    return Math.sqrt(Math.max(0,d*(2*z-d)));
  }

  function sample(x,y,config) {
    const width=Math.max(1,finite(config.width,240));
    const height=Math.max(1,finite(config.height,66));
    const radius=clamp(finite(config.radius,28),0,Math.min(width,height)*0.5);
    const depth=clamp(finite(config.depth,18),0.1,Math.min(width,height)*0.5);
    const refraction=clamp(finite(config.refraction,20),0,100);
    const chromatic=clamp(finite(config.chromatic,0.18),0,1);
    const edgeWidth=clamp(finite(config.edgeWidth,1),0.1,3);
    const sdf=roundedRectSdf(x,y,width,height,radius);
    if(sdf>0)return null;

    const inside=-sdf;
    const e=1.25; // finite difference offset in CSS pixels
    const h=(xx,yy)=>bevelHeight(-roundedRectSdf(xx,yy,width,height,radius),depth);
    const gx=(h(x+e,y)-h(x-e,y))/(2*e);
    const gy=(h(x,y+e)-h(x,y-e))/(2*e);
    const inv=1/Math.hypot(gx,gy,1);
    const nx=-gx*inv,ny=-gy*inv,nz=inv;
    // More refraction at the rim; centre remains close to the backdrop.
    const rim=1-clamp(inside/(depth*edgeWidth),0,1);
    const edge=rim*rim*(3-2*rim);
    const spread=Math.max(0,1-nz)*edge;
    const shiftX=nx*refraction*edge,shiftY=ny*refraction*edge;
    const colorX=nx*chromatic*8*spread,colorY=ny*chromatic*8*spread;
    return {shiftX,shiftY,colorX,colorY,rim:edge,fresnel:Math.pow(Math.max(0,1-nz),4)};
  }

  const api=Object.freeze({roundedRectSdf,bevelHeight,sample});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.GlassOptics=api;
})(typeof globalThis==='undefined'?null:globalThis);
