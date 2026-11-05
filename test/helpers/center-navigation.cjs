'use strict';
// Same public route through the floating rail; legacy baseline uses its tabs.
module.exports=async(page,mode)=>{
 if(await page.locator('.glowme-phase3').count()){
  await page.locator('#sidebarToggleBtn').focus();
  if(await page.locator('#sidebarToggleBtn').getAttribute('aria-expanded')!=='true')await page.keyboard.press('Enter');
  const target=page.locator(`[data-glow-nav="${mode}"]`);
  await target.click();
  // Route data can render before the async navigation handler's finally block.
  // Wait for the real close animation before inspecting/clicking the new page.
  await target.waitFor({state:'visible'});
  await page.waitForFunction(mode=>{
   const button=document.querySelector(`[data-glow-nav="${mode}"]`),sidebar=document.querySelector('#sidebar');
   return !button.disabled&&document.querySelector('#sidebarToggleBtn').getAttribute('aria-expanded')==='false'&&sidebar.getBoundingClientRect().width<=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-width'))+1;
  },mode);
 }else await page.locator(`[data-live-center-mode="${mode}"]`).click();
};
