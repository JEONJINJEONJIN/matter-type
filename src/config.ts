/** 연출·재질·성능 설정. 각 값의 의미와 권장 범위를 주석에 기록한다. */
export const config = {
  library: {
    bulk: 0.5, // 짧은 축 부피 보강; 0은 원형, .3–.7 권장 (최대 1.5배 두께 후 경계 정규화)
    glossyIds: ['can', 'bottle'] as readonly string[], // 약한 광택 허용 물체 ID
    glossRoughness: 0.48, // 캔·병 거칠기; .4–.65
    rustIds: ['key', 'ring', 'coin', 'battery', 'cap'] as readonly string[], // 산화 얼룩을 넣을 금속 종류
    rustColor: '#885332', // 녹 색; 탁한 갈색 권장
    rustStrength: 0.6, // 표면 산화 반점 혼합; .3–.8
    standardShading: true, // 재활용 소재의 거친 표면에 표준 조명 적용; false는 기존 툰
    outlinesByDefault: false, // 자연스러운 더미를 위해 외곽선 기본 OFF; UI에서 선택 가능
    wear: { dent: 0.18, crush: 0.48, edgeDamage: 0.045, fold: 0.24, stain: 0.32 }, // 찌그러짐 0–.5, 구김 0–.6, 얼룩 0–.5
    categoryPalettes: {
      packaging: ['#859995', '#a3907c', '#738691', '#ad8b79', '#c5beab'],
      paper: ['#c6bca7', '#b6a48a', '#d6cfba', '#a59b88', '#c5b49b'],
      broken: ['#777f78', '#9a897d', '#77838a', '#a79784', '#b3aaa0'],
      junk: ['#927963', '#858078', '#a18d72', '#77817a', '#b0a18c'],
    }, // 카테고리별 바랜 색 5개; 낮은 채도 유지

    instanceBatch: 64, // 종류별 초기 인스턴스 용량; 32–128, 필요할 때만 두 배 확장
    radiusRange: [0.06, 0.65] as const, // 선호 월드 반지름 범위; SDF 경계 제한 우선
    selectionWeight: 50, // 카테고리 선택 시 각 종류 비율; 10–100
    naturePalette: ['#acb88a', '#d1bb89', '#829b82', '#be938c', '#efe6cd'], // 차분한 자연물 5색
    geometry: { segments: 12, wireRadius: 0.035 }, // 원형 분할 8–16, 철사 반지름 .02–.06
    materials: {
      plastic: { roughness: 0.84, metalness: 0, opacity: 1 }, // 바랜 플라스틱; roughness .7–.95
      glass: { roughness: 0.08, metalness: 0.1, opacity: 0.62 }, // 저비용 반투명; opacity .4–.8
      chrome: { roughness: 0.82, metalness: 0.45, opacity: 1 }, // 산화 금속; roughness .65–.95
      clay: { roughness: 0.9, metalness: 0, opacity: 1 }, // 무광 점토; .8–1
      paper: { roughness: 1, metalness: 0, opacity: 1 }, // 무광 종이; .9–1
    },
  },
  pop: {
    coverageScale: 2, // 촘촘한 배열에서 물체 전체 확대; 1–2.5, 겹침 허용하되 글자 경계 안으로 제한
    ink: '#14111c', // 오브젝트 외곽선 잉크; 검정 계열 권장
    denseDepth: 0.8, // 기본 z 범위 비율; .5–1
    sparseDepth: 0.35, // 드문드문 z 범위 비율; .2–.5
    defaultWeights: {
      can: 20,
      bottle: 10,
      paper: 20,
      cardboard: 15,
      battery: 10,
      snack: 15,
      cap: 10,
    }, // 초기 상대 비율; 0–100
    controls: {
      minR: { min: 0.06, max: 0.18, step: 0.01 }, // 최소 반지름 UI 범위
      maxR: { min: 0.18, max: 0.65, step: 0.01 }, // 최대 반지름 UI 범위
      density: { min: 0.3, max: 1.5, step: 0.1 }, // 밀도 UI 범위
      letterGap: { min: 0.1, max: 0.5, step: 0.02 }, // 자간 UI 범위
      outlineWidth: { min: 0.01, max: 0.12, step: 0.01 }, // 외곽선 UI 범위
    },
    fontSize: 128, // SDF 글자 해상도; 96–192px
    buffer: 12, // SDF 바깥 여백; 8–24px
    sdfRadius: 32, // SDF 인코딩 거리 범위; 24–48px
    cutoff: 0.5, // SDF 영점 인코딩; .5 권장
    minR: 0.1, // 최소 바운딩 반지름; .06–.18 월드 단위
    maxR: 0.38, // 최대 반지름; .2–.6, 실제 획 두께로 추가 제한
    radiusRatio: 0.6, // 안쪽 거리 대비 반지름; .4–.8
    density: 1.3, // 후보 탐색 밀도; .3–1.5
    attempts: 65, // 목표 개수당 후보 시도; 30–100
    radiusJitter: 0.8, // 반지름 무작위 하한; .7–.95
    strokeFraction: 2 / 3, // 최대 내부 거리 대비 반지름 상한 (= 획 두께의 1/3)
    flatTilt: Math.PI / 6, // 납작한 물체 기울기; 15–30도
    categoryBias: 0.15, // 반대 크기 계열도 등장할 상대 확률; .05–.3
    outlineWidth: 0.06, // 검은 hull 확대율; .02–.1
    background: '#e6e0d3', // 밝은 배경; 크림색·연노랑 권장
    palettes: {
      primary: ['#859995', '#ac9170', '#514d45', '#9c8072', '#d3cbb8'],
      candy: ['#88949b', '#9c9587', '#484e51', '#948781', '#c5c9bd'],
    }, // 바랜 생활색 / 차가운 잿빛 5색
    gradient: [65, 155, 255], // 3단계 툰 명도; 각 0–255
    glossPower: 32, // 하이라이트 집중도; 16–64
    glossStrength: 0.12, // 약한 하이라이트 세기; .05–.2
    edgeLightness: 0.13, // 가장자리 밝게 보정; .05–.2
    geometry: {
      segments: 8, // 원형 둘레 분할; 6–10
      rings: 5, // 구 세로/토러스 단면 분할; 4–6
      bevel: 0.045, // 돌출 모양 모서리; .02–.08
      depth: 0.18, // 별·번개 돌출; .1–.25
      sprinkles: 5, // 도넛 장식 수; 3–6
    },
  },
  text: {
    initial: '버려진 것도\n말이 된다', // 초기 문장; 줄바꿈 포함 최대 240자
    maxLength: 240, // 입력 상한; 60–240자
    debounceMs: 300, // 입력 대기; 200–500ms
    font: '900 800px "Noto Sans KR"', // 측정 폰트; 700–900 두께
    raster: 1024, // 마스크 가로; 512–2048px
    padding: 0.08, // 마스크 여백; .04–.15
    alpha: 100, // 글자 알파 기준; 60–180
  },
  sentence: {
    lineLength: 10, // 자동 줄바꿈 문자 수; 6–14
    lineGap: 0.32, // 글자 높이 대비 줄 사이 여백; .2–.6
    letterGap: 0.22, // 글자 높이 대비 자간; .08–.25
    spaceWidth: 0.45, // 공백 폭; .3–.6 em
    align: 'center' as 'center' | 'left', // 문장 정렬
    glyphObjects: 800, // 짧은 문장 글자당 물체; 300–800
    minGlyphObjects: 180, // 가독성을 위한 최소 예산; 120–200
    budget: 12000, // 전체 물체 상한; 6000–12000
    cacheSize: 256, // 글자 마스크 LRU 상한; 64–256
    samplePoints: 480, // 캐시할 글자 표면 후보 수; 300–600
    raster: 384, // 글자별 마스크 해상도; 256–512
    glyphDelay: 0.055, // 타자 부착 글자 간격; .03–.12초
  },
  objects: {
    maxTriangles: 480, // 한 물체 삼각형 상한; 200–480
    scaleMin: 0.5, // 최소 무작위 배율; .4–.8
    scaleMax: 1.8, // 최대 무작위 배율; 1.4–2
    baseSize: 0.82, // 글자 높이 8 기준 물체 폭; .5–1
    edgeBand: 0.3, // 표면 격자 간격 대비 경계 축소 영역; .2–.5
    edgeScale: 0.72, // 경계 물체 크기 상한 배율; .5–.85
    tilt: 1.2, // 표면 법선 기준 기울기 범위; .6–1.5 rad
    embed: -0.08, // 파묻히는 깊이 / 물체 크기; -.3–0
    protrude: 0.5, // 돌출 거리 / 물체 크기; .2–.5
    layers: 3, // 안쪽부터 쌓는 겹 수; 2–3
    layerStep: 0.27, // 겹당 표면에서 띄우는 거리; .15–.4
    coverageRatio: 0.7, // 뭉침보다 균일한 문자 피복에 우선 배정할 비율; .6–.85
    clusterRatio: 0.16, // 뭉침 시작 확률; .1–.35
    clusterMin: 3, // 뭉침 최소 물체 수; 3–4
    clusterMax: 6, // 뭉침 최대 물체 수; 4–6
    clusterSpread: 0.5, // 덩어리의 접선 퍼짐; .25–.7
    sphereRadius: 0.5, // 내장 구 반지름; .4–.5
    sphereSegments: 8, // 구 가로 분할; 6–10 (200삼각형 제한)
    sphereRings: 6, // 구 세로 분할; 4–8
    icoDetail: 1, // 종이·돌 정이십면체 세분; 0–1
    pebbleFlatten: 0.55, // 조약돌 높이 배율; .4–.7
    ringRadius: 0.35, // 토러스 중심 반지름; .3–.4
    ringTube: 0.13, // 반지 두께; .08–.15
    ringSegments: 10, // 반지 둘레 분할; 8–12
    ringRadial: 6, // 반지 단면 분할; 4–6
    cubeSegments: 2, // 둥근 정육면체 변 분할; 2–3
    candyRadius: 0.34, // 사탕 몸통 반지름; .25–.4
    candyLength: 1.2, // 사탕 몸통 가로 배율; 1–1.4
    candyFlatten: 0.85, // 사탕 몸통 두께 배율; .7–1
    wrapperRadius: 0.21, // 포장 끝 폭; .15–.25
    wrapperLength: 0.3, // 포장 끝 길이; .2–.4
    wrapperOffset: 0.46, // 양쪽 포장 끝 위치; .4–.5
    wrapperSegments: 6, // 포장 끝 단면 분할; 4–8
    wrapperTwist: 0.5, // 양끝 비틀림 각도; .2–.8 rad
    matteRoughness: 0.8, // 종이·돌 거칠기; .6–1
    marbleRoughness: 0.22, // 구슬 광택; .1–.35
    ringRoughness: 0.35, // 반지 거칠기; .2–.5
    ringMetalness: 0.45, // 반지 금속성; .2–.7
    inflateRoughness: 0.66, // 부풀린 이미지 거칠기; .4–.8
    gltfRoughness: 0.7, // 가져온 GLB 기본 거칠기; .4–.9
    paperNoise: 0.16, // 종이 표면 찌그러짐; .08–.22
    pebbleNoise: 0.07, // 조약돌 찌그러짐; .02–.1
    roundedCube: 0.16, // 정육면체 모서리 반경; .1–.2
    inflateGrid: 6, // 이미지 부풀림 시작 격자; 4–8, 예산 초과 시 축소
    inflateHeight: 0.3, // 이미지 중심 높이; .15–.4
    inflateEdge: 0.025, // 이미지 가장자리 두께; .01–.05
    cushionRadius: 0.16, // 불투명 사진 쿠션 모서리; .1–.25
    floorLayers: 4, // 바닥 가상 쌓임 층 수; 2–5
    palettes: {
      paper: ['#e9dcc8', '#cbbfaa', '#f2e8d8', '#d8cbb8'],
      candy: ['#d58273', '#e8a491', '#cb9e64', '#cf786b'],
      pebble: ['#a1a598', '#beb6a3', '#8f9388'],
      marble: ['#88a8a1', '#aac4b7', '#75928e'],
      cube: ['#d5b27f', '#c88c6c', '#ddbd95'],
      ring: ['#bb965d', '#ccb283', '#9d825c'],
    }, // 저채도 개체별 팔레트; 3–6색
  },
  sample: {
    target: 3000, // 표면 조각 목표 상한; 1500–4000개
    min: 1500, // 빽빽한 표면 수량 하한; 1000–2000개
    max: 4000, // 최종 수량 안전 상한; 3000–5000개
    spacing: 0.37, // 빈 마스크 기본 간격; .2–.6
    jitter: 0.28, // 간격 대비 흔들림; 0–.45
    width: 25, // 글자 캔버스 월드 폭; 18–30
    height: 12, // 최소 구도 높이; 10–18
  },
  piece: {
    size: 1, // 초기 조각 크기 배율; .6–1.8
    minSize: 0.6, // 크기 최소; .4–.8
    maxSize: 1.8, // 크기 최대; 1.4–2
    thickness: 0.055, // 조각 두께; .02–.12
    bevel: 0.012, // 둥근 모서리 크기; .005–.025
    bevelSegments: 1, // 모서리 분할; 1–3
    bend: 0.045, // 정점 곡률; 0–.1
    tessellation: 0.32, // 휨용 최대 변 길이; .25–.45 (작을수록 GPU 비용 증가)
    tessellationPasses: 2, // 휨 분할 반복; 1–3 (수천 조각은 2 권장)
    sizeVariance: 0.22, // 개체별 크기 편차; 0–.4
    textureSize: 256, // 이미지 긴 변; 128–512px
    alphaThreshold: 60, // 윤곽/평면 알파 기준; 30–160
    transparencyRatio: 0.015, // 자동 윤곽 선택 투명 비율; .005–.05
    roughness: 0.48, // 이미지 앞면 거칠기; .3–.8
    sideRoughness: 0.38, // 흰 옆면 거칠기; .2–.6
    metalness: 0.03, // 표면 금속성; 0–.1
    sideColor: '#f1e8d9', // 옆면 색; 밝은 중성색 권장
    anisotropy: 4, // 경사 텍스처 품질; 1–8
  },
  sculpture: {
    height: 8, // 실제 글자 높이; 6–12 월드 단위
    depth: 2.2, // z축 글자 두께; 1–3.5
    spacing: 0.32, // 표면 샘플 간격; .22–.5 (수량 제한 내 자동 보정)
    contourRaster: 384, // 표면 배치용 윤곽 래스터; 256–768px
    contourTolerance: 0.018, // 배치 경계 단순화 오차; .008–.04
    minContourArea: 0.003, // 작은 마스크 섬 제거 면적; .001–.01
    normalBlur: 3, // 외향 법선용 마스크 블러; 2–6px
    surfaceOffset: 0.025, // 표면에서 조각을 띄우는 높이; .01–.06
    rimOffset: 0.018, // 모서리 감싸기 조각의 외측 여유; .01–.04
    fitIterations: 4, // 수량/간격 보정 반복 횟수; 3–6
  },
  outline: {
    raster: 64, // 윤곽 래스터; 32–128px
    simplify: 0.012, // 단순화 허용 오차; .005–.03
    minArea: 0.002, // 작은 섬/구멍 제외 면적; .0005–.01
    layers: 4, // 평면 대안 겹침 수; 3–4
    curveSegments: 3, // 곡선 분할; 2–6
  },
  card: {
    radius: 0.065, // 모서리 반경; .02–.15
    border: 0.075, // 흰 테두리; .02–.15
    bottomBorder: 0.16, // 사진 아래 여백; .08–.25
    roughness: 0.65, // 카드 앞면 거칠기; .4–.8
    paperColor: '#fbf7ed', // 카드 종이색; 밝은 중성색 권장
  },
  layout: {
    overlap: 2.0, // 표면 간격 대비 이미지 폭; 1.6–2.3
    tilt: 0.1, // 표면 법선에서 기울어지는 범위; .02–.18 rad
    sparseRetention: 0.52, // 듬성듬성 남기는 비율; .3–.7
    sparseScale: 0.8, // 듬성듬성 조각 크기; .65–.9
    dripRatio: 0.26, // 윗부분에서 흘러내리는 비율; .1–.4
    dripThreshold: 0.4, // 흘러내림 시작 높이 비율; .25–.7
    dripDropRatio: 0.5, // 흘러내린 조각 중 바닥에 놓이는 비율; .3–.7
    dripSag: 0.6, // 표면 아래로 처지는 거리; .2–1
    groundSpread: 1.8, // 떨어진 조각이 바닥으로 퍼지는 거리; .8–3
    groundLift: 0.025, // 바닥 조각의 접촉 여유; .01–.05
    groundLayers: 3, // 흘러내린 바닥 조각의 가상 층 수; 1–4
  },
  animation: {
    attachOrder: 'bottom-up' as 'bottom-up' | 'random', // 부착 순서; bottom-up 또는 random
    duration: 1.15, // 착지까지 시간; .5–2초
    stagger: 0.38, // 개체 출발 지연; .1–.6초
    arc: 2.3, // 비행 최고 높이; 1–5
    entryDistance: 22, // 등장 반경; 18–35
    exitDuration: 0.55, // 퇴장 시간; .3–1초
    lateralCurve: 0.15, // 비행 중 좌우 곡률; 0–.3
  },
  sweep: {
    radius: 0.8, // 떼어내기 반경; .3–2
    minRadius: 0.3, // 반경 최소; .2–.5
    maxRadius: 2, // 반경 최대; 1.5–3
    duration: 1.1, // 낙하 연출 길이; .7–1.6초
    arc: 0.5, // 떨어지기 전 작은 포물선 높이; .2–.9
    outward: 1.0, // 표면 밖으로 떨어지는 거리; .5–2
    spread: 0.6, // 착지 위치 흔들림; .2–1
    spin: 3.14, // 낙하 중 최대 회전; 1–6 rad
    facingThreshold: 0.1, // 뒤쪽 조각을 떼지 않는 시선 내적 기준; 0–.4
  },
  light: {
    angle: 2.2, // 초기 수평 방향; -π–π rad
    height: 50, // 초기 빛 고도; 15–85도
    minHeight: 15, // 고도 최소; 10–30도
    maxHeight: 85, // 고도 최대; 70–89도
    distance: 20, // 광원 거리; 15–30
    intensity: 1.15, // 방향광 강도; 1–3
    hemisphere: 0.45, // 반구광 강도; .3–1.2
    environment: 0.18, // 환경 반사; .1–.5
    fillIntensity: 0.15, // 약한 전면 보조광; .3–1
    rimIntensity: 0.45, // 뒤쪽 테두리광; 1–3
    shadowSize: 2048, // 기본 그림자; 1024–4096px
    reducedShadowSize: 1024, // 고밀도 그림자; 512–2048px
    qualityThreshold: 2200, // 품질 축소 기준; 1500–2500개
    shadowExtent: 19, // 그림자 카메라 반폭; 16–25
    shadowBias: -0.00015, // 깊이 오차 보정; -.0005–0
    normalBias: 0.006, // 표면 acne 보정; .002–.025
    shadowRadius: 3, // 그림자 필터 반경; 1–5
  },
  camera: {
    focusDuration: 0.65, // 더블클릭 확대 전환; .4–1초
    focusMargin: 1.7, // 글자 확대 여백; 1.3–2
    azimuth: 0.35, // 기본 3/4 수평각; .2–.65 rad
    elevation: 0.24, // 기본 위쪽 시점 각도; .15–.4 rad
    minPolar: 0.18, // 최고 시점 극각; .1–.4 rad
    maxPolar: 1.48, // 바닥 아래로 내려가지 않는 극각; 1.3–1.55 rad
    minZoom: 0.45, // 자동 맞춤 거리 대비 최소 줌; .3–.6
    maxZoom: 2.5, // 자동 맞춤 거리 대비 최대 줌; 2–4
    damping: 0.08, // 카메라 감쇠; .04–.15
    autoRotateSpeed: 0.6, // 자동 회전 속도; .2–1.5
    fov: 34, // 수직 화각; 20–40도
    margin: 1.16, // 구도 여백; 1.1–1.5
    near: 0.1, // 근거리 클리핑; .05–.5
    far: 180, // 원거리 클리핑; 120–250
    minAspect: 0.5, // 최소 구도 화면비; .4–1
  },
  floor: {
    backdrop: '#d8d2c4', // 스튜디오 배경색; 따뜻한 회색 권장
    fogNear: 45, // 바닥과 배경이 섞이기 시작하는 거리; 35–70
    fogFar: 110, // 바닥이 완전히 배경에 섞이는 거리; 90–150
    size: 180, // 바닥 폭; 100–250
    textureSize: 512, // 텍스처 크기; 256–1024px
    repeat: 18, // 텍스처 반복; 10–30
    y: 0, // 바닥 높이; -.1–0
    roughness: 0.93, // 바닥 거칠기; .5–1
    bump: 0.012, // 바닥 미세 요철; .005–.04
  },
  post: {
    exposure: 0.95, // ACES 노출; .7–1.3
    blur: 2.1, // 가장자리 흐림; 0–4px
    focusStart: 0.24, // 흐림 시작 거리; .15–.35
    focusEnd: 0.62, // 완전 흐림 거리; .4–.7
    grain: 0.023, // 필름 노이즈; 0–.05
    vignette: 0.23, // 가장자리 명암; 0–.5
    aoRadius: 5, // 저장 AO 반경; 2–10
    aoMin: 0.002, // AO 최소 거리; .001–.005
    aoMax: 0.08, // AO 최대 거리; .02–.15
  },
  performance: {
    movingShadowHz: 20, // 이동 중 그림자 갱신 상한; 15–30Hz, 정지 종점과 저장은 즉시 갱신
    smallObjectShadows: false, // 작은 물체도 그림자 생성; 저사양은 false
    shadowObjectSize: 0.25, // 그림자를 만드는 물체 크기 하한; .2–.4
    previewDpr: 1, // 조작 미리보기 DPR; 1–1.5
    benchmarkSeconds: 6, // 느린 장치의 구간별 측정 시간 상한; 4–10초
    benchmarkWarmupFrames: 3, // 셰이더 워밍업 프레임; 3–12
    benchmarkFrames: 1200, // 성능 측정 프레임 상한; 600–1200 (6초 먼저 도달 시 종료)
    maxDpr: 1.5, // 미리보기 DPR 상한; 1–2
    exportScale: 2, // PNG 해상도 배율; 2 권장
    maxExportDimension: 8192, // 저장 긴 변 상한; 4096–8192px
  },
  assets: {
    maxFiles: 12, // 이미지 종류 상한; 1–12장
    maxFileBytes: 25 * 1024 * 1024, // 파일 크기 상한; 10–25MB
  },
  seed: 729143, // 초기 시드; unsigned 32-bit 정수
} as const;
