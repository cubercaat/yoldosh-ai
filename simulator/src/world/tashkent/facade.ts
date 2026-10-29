import { BoxGeometry, MeshStandardMaterial, type Material } from 'three'

/**
 * Fasad materiali: derazalar shader'da protsedura bilan chiziladi (tekstura kerak emas, binoning haqiqiy o'lchamiga qarab).
 * Instanced (bino) ham, oddiy mesh (diqqatga sazovor joy; geometriya [0..1] birlik quti, mesh.scale = o'lcham) ham ishlaydi.
 * Ko'k rangli (b > r) material = shisha fasad (hamma yuza shisha), boshqalari = devor + deraza qatorlari.
 */
const VERT_COMMON = '#include <common>\nvarying vec3 vM; varying vec3 vN;'
const VERT_BEGIN = `#include <begin_vertex>
vec3 isz = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
#ifdef USE_INSTANCING
isz *= vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
vM = position * isz; vN = normal;`
const FRAG_COMMON = '#include <common>\nvarying vec3 vM; varying vec3 vN;'
const FRAG_COLOR = `#include <color_fragment>
if (abs(vN.y) < 0.5) {
  float u = abs(vN.x) > 0.5 ? vM.z : vM.x;
  vec2 f = fract(vec2(u / 3.4, vM.y / 3.3));
  float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.78) * step(2.6, vM.y);
  float glassy = step(0.08, diffuseColor.b - diffuseColor.r);
  float curtain = step(0.07, f.x) * step(f.x, 0.93) * step(0.07, f.y) * step(f.y, 0.93);
  win = mix(win, curtain, glassy);
  vec3 glass = mix(vec3(0.13, 0.2, 0.3), vec3(0.32, 0.5, 0.7), glassy * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.93);
  float band = step(vM.y, 0.55) * (1.0 - glassy);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.7, band);
} else if (vN.y > 0.5) { diffuseColor.rgb *= 0.6; }`

export function facadeMaterial(color = '#ffffff', metal = 0): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness: metal ? 0.35 : 0.85, metalness: metal })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VERT_COMMON).replace('#include <begin_vertex>', VERT_BEGIN)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', FRAG_COMMON).replace('#include <color_fragment>', FRAG_COLOR)
  }
  m.customProgramCacheKey = () => 'tkfacade'
  return m
}
/** [0..1] birlik quti (burchagi koordinata boshida) */
export const unitBox = (() => { const g = new BoxGeometry(1, 1, 1); g.translate(0.5, 0.5, 0.5); return g })()
const cache = new Map<string, Material>()
export const facadeCached = (c: string): Material => { let m = cache.get(c); if (!m) { m = facadeMaterial(c); cache.set(c, m) } return m }
