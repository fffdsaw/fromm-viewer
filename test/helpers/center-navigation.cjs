'use strict';
// Same public route through the floating rail; legacy baseline uses its tabs.
module.exports=async(page,mode)=>{
 if(await page.locator('.glowme-phase3').count()){
  await page.locator('#sidebarToggleBtn').focus();
  if(await page.locator('#sidebarToggleBtn').getAttribute('aria-expanded')!=='true')await page.keyboard.press('Enter');
  await page.locator(`[data-glow-nav="${mode}"]`).click();
 }else await page.locator(`[data-live-center-mode="${mode}"]`).click();
};
