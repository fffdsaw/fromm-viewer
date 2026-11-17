/* A continuous capsule field for the menu lens. Keep the sampled image whole and
 * bend its coordinates toward the centre instead of crossfading displaced and
 * undisplaced lettering through a thin alpha mask. The shared SDK still owns
 * RGB displacement, live strength, specular light and filter lifecycle. */
const ns='http://www.w3.org/2000/svg';
let cached=null;
export function applyRailLens(glass){
 const filter=glass.filter,svg=filter?.filter,image=filter?.feImageDisp;
 if(glass.destroyed||glass.suspended||!svg||!image)return;
 const width=glass.currentWidth,height=glass.currentHeight,radius=glass.computedRadius(),padding=-Number(image.getAttribute('x'));
 const band=Math.min(Math.min(width,height)*.3,Math.max(3,glass.computedThickness()*.32));
 const key=[width,height,radius,padding,band].join(':');
 if(cached?.key!==key){
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width+2*padding);canvas.height=Math.ceil(height+2*padding);
  const context=canvas.getContext('2d'),pixels=context.createImageData(canvas.width,canvas.height),data=pixels.data;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const dx=x+.5-padding-width/2,dy=y+.5-padding-height/2,qx=Math.abs(dx)-(width/2-radius),qy=Math.abs(dy)-(height/2-radius);
   const ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy),depth=radius-length-Math.min(Math.max(qx,qy),0);
   let nx=0,ny=0;
   if(length){nx=ox/length;ny=oy/length;}else if(qx>qy)nx=1;else ny=1;
   nx*=Math.sign(dx);ny*=Math.sign(dy);
   // Zero displacement at the outer contour and at the clear centre avoids
   // an alpha seam between two glyph copies. The rounded normal bends the source.
   const curve=depth>0&&depth<band?Math.sin(Math.PI*depth/band)**2*.04:0,i=(y*canvas.width+x)*4;
   data[i]=Math.round(128-nx*curve*255);data[i+1]=Math.round(128-ny*curve*255);data[i+2]=128;data[i+3]=255;
  }
  context.putImageData(pixels,0,0);cached={key,url:canvas.toDataURL()};
 }
 image.setAttribute('href',cached.url);
 let neutral=svg.querySelector('[data-rail-neutral]');
 if(!neutral){
  neutral=document.createElementNS(ns,'feComponentTransfer');neutral.dataset.railNeutral='';neutral.setAttribute('in','dispMap');neutral.setAttribute('result','railDispMap');
  // Eight-bit 128 is slightly above 0.5. Correct it so neutral pixels really
  // leave the resting label unchanged, even at maximum user refraction.
  for(const channel of ['R','G']){const fn=document.createElementNS(ns,'feFunc'+channel);fn.setAttribute('type','linear');neutral.append(fn);}
  image.after(neutral);
 }
 for(const map of svg.querySelectorAll('feDisplacementMap'))map.setAttribute('in2','railDispMap');
 updateRailCrossing(glass);
}
export function updateRailCrossing(glass){
 const amount=Number(glass.element.parentElement.style.getPropertyValue('--rail-crossing'))||0;
 for(const fn of glass.filter?.filter.querySelectorAll('[data-rail-neutral]>*')||[]){
  fn.setAttribute('slope',String(amount));fn.setAttribute('intercept',String(.5-128/255*amount));
 }
}
