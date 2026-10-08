/** false로 바꾸면 관련 UI와 실행 경로가 함께 사라지는 기능 스위치. */
export const features: Record<
  | 'popOutline'
  | 'gloss'
  | 'gltfUpload'
  | 'inflate'
  | 'orbit'
  | 'autoRotate'
  | 'sweep'
  | 'sparse'
  | 'drip'
  | 'outlineMode'
  | 'bend'
  | 'tiltShift'
  | 'grain'
  | 'vignette'
  | 'exportAO',
  boolean
> = {
  popOutline: true,
  gloss: true,
  gltfUpload: true,
  inflate: true,
  orbit: true,
  autoRotate: true,
  sweep: true,
  sparse: true,
  drip: true,
  outlineMode: true,
  bend: true,
  tiltShift: false,
  grain: true,
  vignette: true,
  exportAO: true,
};
