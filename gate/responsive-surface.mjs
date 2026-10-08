// Wait on the rendered surface after navigation/reload before classifying it.
// Both layouts remain in the DOM; absence during startup is not desktop proof.
export async function compactSurface(page){
 const surface=page.locator('.career-mobile-hud:visible, .career-progress:visible');
 await surface.waitFor({state:'visible'});
 return surface.evaluate(el=>el.matches('.career-mobile-hud'));
}
