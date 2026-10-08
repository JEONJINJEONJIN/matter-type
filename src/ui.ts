/** 순수 DOM UI. 상태만 읽고 쓰며 three.js와 렌더 구현을 참조하지 않는다. */
import { config } from './config';
import { features } from './features';
import { state } from './state';
import type { ObjectAsset, FloorMode, LayoutMode } from './state';
import { createBuiltins, categories } from './objects/library';
import { inflate } from './objects/inflate';
import { loadGLB } from './objects/gltf';
import { createSamples, loadImage } from './pieces/samples';
const icons = {
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  shuffle: '<path d="m3 5 4 0 10 14h4m-4-4 4 4-4 4M3 19h4L17 5h4m-4-4 4 4-4 4"/>',
  save: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  sweep: '<path d="m16 3-6 10m-3-2 8 5-4 6-9-5zM18 17h4m-5 4h3"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
};
const icon = (name: keyof typeof icons) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
export function createUI(root: HTMLElement) {
  root.innerHTML = `
    <header class="masthead"><a class="brand" href="./" aria-label="사물로 쓰다 홈"><span class="brand-symbol">m<span>·</span></span><div><strong>사물로 쓰다</strong><small>MATTER TYPE / OBJECT STUDY</small></div></a><div class="edition">버려진 것들도 모이면<br>말이 된다.</div></header>
    <main class="workspace"><canvas id="scene" aria-label="3D 물체로 만든 3D 타이포그래피"></canvas>
      <div class="work-label"><span class="live-dot"></span> DISCARDED THINGS, NEW WORDS <span class="work-number">STUDY — 001</span></div>
      <div class="loading" role="status"><span></span>사물들을 펼치고 있어요</div>
      <div class="canvas-caption"><span id="piece-count">0</span>개의 버려진 사물, 하나의 이야기.</div>
      <div class="light-control"><span class="eyebrow">LIGHT DIRECTION</span><div class="light-dial" role="slider" tabindex="0" aria-label="빛 방향" aria-valuemin="0" aria-valuemax="360"><i></i><span>☀</span></div><small>드래그하여 빛을 돌려보세요</small></div>
      <button class="settings-toggle icon-button" title="설정 열기" aria-label="설정 열기" aria-expanded="false">${icon('settings')}</button>
      <aside class="settings" hidden><div class="panel-heading"><span>작품 설정</span><button class="close-settings" aria-label="설정 닫기">×</button></div>
        <label class="setting-label">물체 크기 <output id="size-out">1.00</output><input id="piece-size" type="range" min="${config.piece.minSize}" max="${config.piece.maxSize}" step="0.05" value="${config.piece.size}"></label>
        <label class="setting-label">빛 높이 <output id="height-out">${config.light.height}°</output><input id="light-height" type="range" min="${config.light.minHeight}" max="${config.light.maxHeight}" value="${config.light.height}"></label>
        <label class="setting-label">바닥<select id="floor"><option value="paper">따뜻한 종이</option><option value="wood">오크 나무</option><option value="concrete">차분한 콘크리트</option></select></label>
        ${features.sweep ? `<label class="setting-label">떼어내기 반경 <output id="radius-out">${config.sweep.radius.toFixed(1)}</output><input id="sweep-radius" type="range" min="${config.sweep.minRadius}" max="${config.sweep.maxRadius}" step="0.1" value="${config.sweep.radius}"></label>` : ''}
        ${features.orbit && features.autoRotate ? '<label class="switch-row"><span>천천히 자동 회전</span><input type="checkbox" id="auto-rotate"></label>' : ''}
        <div class="setting-divider"></div><span class="eyebrow">PHOTOGRAPHIC FINISH</span>
        ${(['tiltShift', 'grain', 'vignette', 'exportAO'] as const)
          .filter((k) => features[k])
          .map(
            (k) =>
              `<label class="switch-row"><span>${{ tiltShift: '가장자리 흐림', grain: '필름 그레인', vignette: '비네팅', exportAO: '저장 시 깊은 접촉 그림자' }[k]}</span><input type="checkbox" id="${k}" ${state.get()[k] ? 'checked' : ''}></label>`,
          )
          .join('')}
        <label class="setting-label seed-label">배치 시드<input id="seed" type="number" min="0" max="4294967295" value="${config.seed}"></label>
        <p class="panel-note">같은 이미지와 글자, 같은 시드로<br>같은 순간을 다시 만들 수 있어요.</p>
      </aside>
      <div class="drop-overlay"><div>${icon('upload')}<strong>이곳에 이미지를 놓아주세요</strong><span>여러 장을 함께 사용할 수 있어요</span></div></div>
    </main>
    <footer class="editor"><div class="toolbar">
      <label class="text-control"><span class="eyebrow">01 / WORD</span><textarea id="text" aria-label="만들 글자" maxlength="${config.text.maxLength}" rows="2" placeholder="어떤 말을 쓸까요?" spellcheck="false">${config.text.initial}</textarea></label>
      <div class="material-control"><span class="eyebrow">02 / MATERIAL</span><button id="materials" class="material-button" aria-expanded="false"><img id="material-thumb" alt=""><span id="material-name">캔 + 종이 + 박스</span><span class="chevron">⌃</span></button></div>
      <div class="layout-control"><span class="eyebrow">03 / ARRANGE</span><div class="segments" aria-label="배열 방식"><button data-layout="dense">덕지덕지</button>${features.sparse ? '<button data-layout="sparse">드문드문</button>' : ''}${features.drip ? '<button data-layout="drip">깊게 쌓기</button>' : ''}</div></div>
      <div class="tools">${features.sweep ? `<button id="sweep" class="tool-button" aria-pressed="false" title="글자 위를 드래그해서 조각을 떼어내세요">${icon('sweep')}<span>떼어내기</span></button>` : ''}<button id="shuffle" class="tool-button" title="새 시드로 다시 섞기">${icon('shuffle')}<span>다시 섞기</span></button><button id="save" class="save-button">${icon('save')}<span>PNG 저장</span><small>2×</small></button></div>
    </div><div class="footer-note"><span id="hint">드래그로 회전 · 글자 더블클릭 확대 · 최대 240자</span><span>MADE OF LITTLE THINGS <span class="footer-dot">·</span> ${new Date().getFullYear()}</span></div></footer>
    <section class="material-panel" hidden><div class="panel-heading"><span>버려진 무엇으로 쓸까요?</span><button id="close-materials" aria-label="소재 닫기">×</button></div><div class="category-palette"><label><input id="mix-categories" type="checkbox" checked> 여러 카테고리 섞기</label><div class="category-buttons"></div></div><div class="object-list"></div>
    ${features.inflate ? '<button id="upload" class="upload-button">이미지를 부풀려 추가하기</button><input id="files" type="file" accept="image/*" multiple hidden><details><summary>샘플 이미지 부풀리기</summary><div class="sample-grid"></div></details>' : ''}
    ${features.gltfUpload ? '<button id="upload-glb" class="upload-button">GLB 물체 추가하기 · 480삼각형 이하</button><input id="glb-files" type="file" accept=".glb" multiple hidden>' : ''}
    <p>여러 물체를 선택하고 상대 비율을 조절하세요. 이미지·GLB 드래그도 지원합니다.</p></section>
    <div id="message" role="status" aria-live="polite" hidden></div>`;
  const el = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const initialObjects = createBuiltins();
  const settings = el('.settings');
  const controls = document.createElement('div');
  controls.innerHTML = `<div class="setting-divider"></div><span class="eyebrow">MATERIAL / SHAPE</span>
    ${Object.entries(config.pop.controls)
      .filter(([key]) => key !== 'outlineWidth' || features.popOutline)
      .map(([key, range]) => {
        const label = {
          minR: '최소 반지름',
          maxR: '최대 반지름',
          density: '밀도',
          letterGap: '자간',
          outlineWidth: '외곽선 두께',
        }[key as keyof typeof config.pop.controls];
        return `<label class="setting-label">${label}<output>${state.get()[key as import('./state').StateKey]}</output><input data-pop="${key}" aria-label="${label}" type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${state.get()[key as import('./state').StateKey]}"></label>`;
      })
      .join('')}
    <label class="setting-label">팔레트<select id="palette"><option value="primary">바랜 생활색</option><option value="candy">차가운 잿빛</option></select></label>
    <label class="setting-label">배경색<input id="background" type="color" value="${state.get().background}"></label>
    ${(['popOutline', 'gloss'] as const)
      .filter((key) => features[key])
      .map(
        (key) =>
          `<label class="switch-row"><span>${{ popOutline: '검은 외곽선', gloss: '광택 하이라이트' }[key]}</span><input type="checkbox" id="${key}" ${state.get()[key] ? 'checked' : ''}></label>`,
      )
      .join('')}`;
  settings.querySelector('.panel-heading')!.after(controls);
  controls.querySelectorAll<HTMLInputElement>('[data-pop]').forEach((input) => {
    input.oninput = () => {
      input.parentElement!.querySelector('output')!.textContent = input.value;
    };
    input.onchange = () => state.set({ [input.dataset.pop!]: Number(input.value) });
  });
  for (const key of ['popOutline', 'gloss'] as const)
    if (features[key])
      el<HTMLInputElement>('#' + key).onchange = (e) =>
        state.set({ [key]: (e.target as HTMLInputElement).checked });
  el<HTMLSelectElement>('#palette').onchange = (e) =>
    state.set({
      palette: (e.target as HTMLSelectElement).value as keyof typeof config.pop.palettes,
    });
  el<HTMLInputElement>('#background').oninput = (e) =>
    state.set({ background: (e.target as HTMLInputElement).value });
  if (features.inflate) {
    for (const asset of createSamples()) {
      const button = document.createElement('button');
      button.className = 'sample';
      button.textContent = asset.name;
      button.onclick = () => {
        try {
          if (
            state.get().objects.filter((o) => o.source !== 'builtin').length >=
            config.assets.maxFiles
          )
            throw new Error('업로드 물체는 최대 12개입니다.');
          const object = inflate(asset);
          object.id = crypto.randomUUID();
          state.set({ objects: [...state.get().objects, object] });
        } catch (e) {
          state.set({ error: String(e) });
        }
      };
      el('.sample-grid').append(button);
    }
  }
  for (const [category, name] of Object.entries(categories)) {
    const button = document.createElement('button');
    button.textContent = name;
    button.dataset.category = category;
    button.onclick = () => {
      const current = state.get().objects;
      const mixing = el<HTMLInputElement>('#mix-categories').checked;
      const active = current.some((o) => o.libraryCategory === category && o.weight > 0);
      const objects = current.map((o) => ({
        ...o,
        weight:
          o.libraryCategory === category
            ? mixing && active
              ? 0
              : config.library.selectionWeight
            : mixing
              ? o.weight
              : 0,
      }));
      if (!objects.some((o) => o.weight > 0)) {
        state.set({ notice: '카테고리를 하나 이상 선택해주세요.' });
        return;
      }
      state.set({ objects });
    };
    el('.category-buttons').append(button);
  }
  function objectControls() {
    const list = el('.object-list');
    list.replaceChildren();
    root.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(
          state
            .get()
            .objects.some((o) => o.libraryCategory === button.dataset.category && o.weight > 0),
        ),
      );
    });
    for (const object of state.get().objects) {
      const row = document.createElement('div');
      row.className = 'object-row';
      const label = document.createElement('label'),
        checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = object.weight > 0;
      checkbox.setAttribute('aria-label', object.name + ' 사용');
      label.append(checkbox, document.createTextNode(object.name));
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.value = String(object.weight);
      slider.setAttribute('aria-label', object.name + ' 비율');
      const output = document.createElement('output');
      output.textContent = String(object.weight);
      const setWeight = (weight: number) => {
        const objects = state.get().objects.map((o) => (o.id === object.id ? { ...o, weight } : o));
        if (!objects.some((o) => o.weight > 0)) {
          state.set({ notice: '물체를 하나 이상 선택해주세요.' });
          objectControls();
          return;
        }
        state.set({ objects });
      };
      checkbox.onchange = () => setWeight(checkbox.checked ? 50 : 0);
      slider.oninput = () => {
        output.textContent = slider.value;
      };
      slider.onchange = () => setWeight(Number(slider.value));
      row.append(label, slider, output);
      list.append(row);
    }
  }
  function toggleMaterials(open: boolean) {
    el('.material-panel').hidden = !open;
    el('#materials').setAttribute('aria-expanded', String(open));
  }
  el('#materials').onclick = () => toggleMaterials(el('.material-panel').hidden);
  el('#close-materials').onclick = () => toggleMaterials(false);
  function toggleSettings(open: boolean) {
    el('.settings').hidden = !open;
    el('.settings-toggle').setAttribute('aria-expanded', String(open));
  }
  el('.settings-toggle').onclick = () => toggleSettings(el('.settings').hidden);
  el('.close-settings').onclick = () => toggleSettings(false);
  const input = el<HTMLTextAreaElement>('#text');
  let debounce: ReturnType<typeof setTimeout>;
  let composing = false;
  const updateText = () => {
    clearTimeout(debounce);
    if (!composing)
      debounce = setTimeout(() => state.set({ text: input.value }), config.text.debounceMs);
  };
  input.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(debounce);
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    updateText();
  });
  input.oninput = updateText;
  root
    .querySelectorAll<HTMLButtonElement>('[data-layout]')
    .forEach(
      (button) =>
        (button.onclick = () => state.set({ layout: button.dataset.layout as LayoutMode })),
    );
  if (features.sweep) el('#sweep').onclick = () => state.set({ sweep: !state.get().sweep });
  el('#shuffle').onclick = () => state.set({ seed: crypto.getRandomValues(new Uint32Array(1))[0] });
  el('#save').onclick = () => {
    clearTimeout(debounce);
    state.set({ text: input.value });
    state.set({ exportRequest: state.get().exportRequest + 1 });
  };
  el<HTMLInputElement>('#piece-size').onchange = (e) =>
    state.set({ pieceSize: Number((e.target as HTMLInputElement).value) });
  el<HTMLInputElement>('#light-height').oninput = (e) =>
    state.set({ lightHeight: Number((e.target as HTMLInputElement).value) });
  if (features.sweep)
    el<HTMLInputElement>('#sweep-radius').oninput = (e) =>
      state.set({ sweepRadius: Number((e.target as HTMLInputElement).value) });
  el<HTMLSelectElement>('#floor').onchange = (e) =>
    state.set({ floor: (e.target as HTMLSelectElement).value as FloorMode });
  el<HTMLInputElement>('#seed').onchange = (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    state.set({ seed: Number.isFinite(value) ? value >>> 0 : config.seed });
  };
  for (const key of ['tiltShift', 'grain', 'vignette', 'exportAO'] as const)
    if (features[key])
      el<HTMLInputElement>(`#${key}`).onchange = (e) =>
        state.set({ [key]: (e.target as HTMLInputElement).checked });
  if (features.orbit && features.autoRotate)
    el<HTMLInputElement>('#auto-rotate').onchange = (e) =>
      state.set({ autoRotate: (e.target as HTMLInputElement).checked });
  let uploading = false;
  async function upload(files: File[]) {
    if (uploading || !files.length) return;
    uploading = true;
    state.set({ error: '', notice: '물체를 만들고 있어요…' });
    const added: ObjectAsset[] = [],
      errors: string[] = [];
    try {
      const capacity = Math.max(
        0,
        config.assets.maxFiles - state.get().objects.filter((o) => o.source !== 'builtin').length,
      );
      for (const file of files.slice(0, capacity))
        try {
          if (file.name.toLowerCase().endsWith('.glb')) {
            if (!features.gltfUpload) throw new Error('GLB 업로드가 꺼져 있습니다.');
            added.push(await loadGLB(file));
          } else {
            if (!features.inflate) throw new Error('이미지 부풀리기가 꺼져 있습니다.');
            added.push(inflate(await loadImage(file)));
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      if (added.length) state.set({ objects: [...state.get().objects, ...added] });
      state.set({
        error: errors.join(' '),
        notice:
          files.length > capacity
            ? '업로드 물체는 최대 12개입니다.'
            : `${added.length}개 물체 추가 완료`,
      });
    } finally {
      uploading = false;
    }
  }
  for (const [enabled, buttonId, inputId] of [
    [features.inflate, '#upload', '#files'],
    [features.gltfUpload, '#upload-glb', '#glb-files'],
  ] as const)
    if (enabled) {
      const files = el<HTMLInputElement>(inputId);
      el(buttonId).onclick = () => files.click();
      files.onchange = () => {
        void upload(Array.from(files.files ?? []));
        files.value = '';
      };
    }
  let dragDepth = 0;
  root.addEventListener('dragenter', (e) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      dragDepth++;
      el('.drop-overlay').classList.add('visible');
    }
  });
  root.addEventListener('dragover', (e) => e.preventDefault());
  root.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) el('.drop-overlay').classList.remove('visible');
  });
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    el('.drop-overlay').classList.remove('visible');
    void upload(Array.from(e.dataTransfer?.files || []));
  });
  const dial = el('.light-dial');
  function dialMove(e: PointerEvent) {
    const r = dial.getBoundingClientRect();
    state.set({
      lightAngle: Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2),
    });
  }
  dial.onpointerdown = (e) => {
    dial.setPointerCapture(e.pointerId);
    dialMove(e);
  };
  dial.onpointermove = (e) => {
    if (dial.hasPointerCapture(e.pointerId)) dialMove(e);
  };
  dial.onkeydown = (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      state.set({
        lightAngle:
          state.get().lightAngle + (e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.1 : 0.1),
      });
    }
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleMaterials(false);
      toggleSettings(false);
      state.set({ sweep: false });
    }
  });
  let messageTimer: ReturnType<typeof setTimeout>;
  state.subscribe((s, keys) => {
    el('#piece-count').textContent = s.targets.length.toLocaleString('ko-KR');
    el('.loading').hidden = s.ready;
    el('#hint').textContent = s.sweep
      ? '떼어내기 모드 · 글자 위를 드래그해서 조각을 떨어뜨리세요. Esc로 종료'
      : !s.text.trim()
        ? '글자를 입력하면 사물들이 모여들어요.'
        : '드래그로 회전 · 글자 더블클릭 확대 · 최대 240자';
    el('#scene').classList.toggle('sweeping', s.sweep);
    root.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === s.layout);
      b.setAttribute('aria-pressed', String(b.dataset.layout === s.layout));
    });
    root
      .querySelectorAll<HTMLButtonElement>('[data-sample]')
      .forEach((b) => b.classList.toggle('active', b.dataset.sample === s.selectedSample));
    if (features.sweep) {
      el('#sweep').classList.toggle('active', s.sweep);
      el('#sweep').setAttribute('aria-pressed', String(s.sweep));
      el('#radius-out').textContent = s.sweepRadius.toFixed(1);
    }
    el('#size-out').textContent = s.pieceSize.toFixed(2);
    el('#height-out').textContent = `${s.lightHeight}°`;
    el<HTMLInputElement>('#seed').value = String(s.seed);
    dial.style.setProperty('--angle', `${s.lightAngle}rad`);
    dial.setAttribute(
      'aria-valuenow',
      String(Math.round(((s.lightAngle * 180) / Math.PI + 360) % 360)),
    );
    const save = el<HTMLButtonElement>('#save');
    save.disabled = s.busy || !s.ready;
    save.querySelector('span')!.textContent = s.busy ? '저장 중…' : 'PNG 저장';
    if (keys.has('objects')) {
      objectControls();
      el('#material-name').textContent =
        s.objects
          .filter((o) => o.weight > 0)
          .map((o) => o.name)
          .slice(0, 3)
          .join(' + ') +
        (s.objects.filter((o) => o.weight > 0).length > 3
          ? ' 외 ' + (s.objects.filter((o) => o.weight > 0).length - 3) + '종'
          : '');
      el('#material-thumb').hidden = true;
    }
    if (keys.has('notice') || keys.has('error')) {
      const message = el('#message');
      message.textContent = s.error || s.notice;
      message.hidden = !message.textContent;
      message.classList.toggle('error', !!s.error);
      clearTimeout(messageTimer);
      if (!s.error)
        messageTimer = setTimeout(() => {
          message.hidden = true;
        }, 5000);
    }
  });
  return { canvas: el<HTMLCanvasElement>('#scene'), initialObjects };
}
