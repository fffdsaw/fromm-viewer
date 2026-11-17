/* App-owned full-strength optics for the pinned Meapri engine. The upstream
 * material model/worker and browser fallback remain; policy reductions do not.
 * Keep these overrides covered when upgrading vendor/meapri (MIT). */
import {applyRailLens} from './web-rail-lens.js?v=continuous-lens-20261117';
const classes=new WeakMap();
const regenerating=new WeakMap();
export function materialOptions(settings){
 return {
  scheme:document.documentElement.dataset.frommTheme==='classic'?'dark':'light',
  quality:'high',lazy:false,mapPixelRatio:1,
  thickness:settings.thickness,refraction:settings.refraction,blur:settings.blur,
  saturation:settings.saturation,chromaticAberration:settings.chromatic/100,
  tint:'rgba(255,255,255,0)',specular:settings.specular>0,
  specularIntensity:settings.specular/100*settings.opacity/28
 };
}
export function createGlass(Engine,element,options){
 let FullGlass=classes.get(Engine);
 if(!FullGlass){
  FullGlass=class extends Engine {
   get fixedSurface(){return this.element.classList.contains('fixed-glass-surface');}
   // Fixed action chrome needs the SDK's specular material, but no displacement
   // map, RGB topology, GPU scene copy or scroll-safe filter swapping.
   shouldFallback(){return this.fixedSurface?false:super.shouldFallback();}
   shouldUseScrollSafe(){return !this.fixedSurface&&super.shouldUseScrollSafe();}
   async installFixedMaterial(){
    if(this.suspended||this.destroyed)return;
    this.cancelPendingBuild();const generation=this.buildGeneration;
    const map=this.options.specular?await this.specularMapUrl():null;
    if(!this.isBuildCurrent(generation))return;
    this.element.style.backgroundImage=map?`url("${map}")`:'none';
    const filter=`blur(${this.effectiveBlur()}px) saturate(${this.options.saturation/100})`;
    this.element.style.backdropFilter=filter;this.element.style.webkitBackdropFilter=filter;
    this.element.dataset.fixedMaterial='ready';
   }
   async installFilter(){if(this.fixedSurface)return this.installFixedMaterial();await super.installFilter();if(this.element.classList.contains('rail-lens-surface'))applyRailLens(this);}
   async regenerateAfterResize(){if(this.fixedSurface)return this.installFixedMaterial();await super.regenerateAfterResize();if(this.element.classList.contains('rail-lens-surface'))applyRailLens(this);}
   effectiveRefraction(){return this.options.refraction;}
   profiledRefraction(){return this.options.refraction;}
   computedThickness(){return this.options.thickness;}
   effectiveBlur(){return this.options.blur;}
   profiledSpecularIntensity(){return this.options.specularIntensity;}
   displacementDpr(){return this.options.mapPixelRatio;}
   specularDpr(){return this.options.mapPixelRatio;}
   scheduleRegen(){
    cancelAnimationFrame(regenerating.get(this));
    regenerating.set(this,requestAnimationFrame(()=>{regenerating.delete(this);if(!this.destroyed&&!this.suspended){if(this.filter||this.usesFallback)this.regenerateAfterResize();else this.scheduleBuild(()=>this.installFilter());}}));
   }
   destroy(){cancelAnimationFrame(regenerating.get(this));regenerating.delete(this);super.destroy();}
   scheduleBuild(build){
    this.cancelPendingBuild();const generation=this.buildGeneration;
    queueMicrotask(()=>{
     if(!this.isBuildCurrent(generation))return;
     let current=generation;
     const fallback=()=>{if(this.isBuildCurrent(current)){this.usesFallback=true;this.element.style.backdropFilter='none';this.element.style.webkitBackdropFilter='none';}};
     try{const work=build();current=this.buildGeneration;Promise.resolve(work).catch(fallback);}catch{fallback();}
    });
   }
   update(next){
    const chromatic=this.options.chromaticAberration;super.update(next);
    // The pinned SDK otherwise only changes displacement scale and leaves the
    // old RGB filter topology/strength in place after a preference change.
    if(chromatic!==this.options.chromaticAberration)this.rebuild();
   }
  };
  classes.set(Engine,FullGlass);
 }
 return new FullGlass(element,options);
}
