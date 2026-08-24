'use client';

import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

const presets = [4, 8, 16, 32];
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;
const initialTeams = ['STELLAR PINK', 'NOVA RUSH', 'BLUE IGNITION', 'VOLT CREW', 'LUNAR SPARK', 'BEAT BREAKERS', 'MAGENTA FORCE', 'KNOCK OUT', 'CYBER BLOOM', 'NEON EDGE', 'RAPID BEAT', 'ZERO LIMIT', 'AQUA DRIVE', 'SONIC WAVE', 'FROST BYTE', 'REV UNIT'];
const BOARD_W = 1120;
const WIDE_BOARD_W = 1320;
const BOARD_H = 560;
const titleFonts: Record<string, string> = {
  sport: '"Arial Black", Impact, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif',
  gothic: '"Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
  mincho: '"Yu Mincho", "Hiragino Mincho ProN", serif',
  brush: '"Road Rage", Impact, "Yu Gothic", sans-serif',
};
const defaultBackgrounds = [
  { id: 'kanon-rev', name: 'SIDE DUEL', src: asset('kanon-rev-bg.png') },
  { id: 'kanon-rev-center', name: 'CENTER DUEL', src: asset('kanon-rev-center-bg.png') },
];
const defaultWinnerImages = [
  { id: 'brush', name: 'GOLD BRUSH', src: asset('winner-brush-gold.png') },
  { id: 'blade', name: 'GOLD BLADE', src: asset('winner-brush-gold-blade.png') },
  { id: 'rainbow', name: 'RAINBOW', src: asset('winner-rainbow.png') },
  { id: 'neon-chrome', name: 'NEON CHROME', src: asset('winner-neon-chrome.png') },
];
const defaultPlateImages = [
  { id: 'dogtag', name: 'DOG TAG', src: asset('dogtag-plate.png') },
  { id: 'neon', name: 'NEON CHROME', src: asset('plate-neon-chrome.png') },
  { id: 'carbon', name: 'CARBON RED', src: asset('plate-carbon-red.png') },
  { id: 'gold', name: 'BLACK GOLD', src: asset('plate-black-gold.png') },
];
const DEFAULT_PLATE_IMAGE = asset('plate-neon-chrome.png');
const DEFAULT_BRACKET_TRANSFORM: Transform = { x: 0, y: 0, scale: 100 };
const DEFAULT_WINNER_TRANSFORM: Transform = { x: 0, y: 0, scale: 100 };
const makeTransformMap = (value: Transform) => Object.fromEntries(presets.map(size => [size, { ...value }])) as Record<number, Transform>;
const DEFAULT_BRACKET_TRANSFORMS = makeTransformMap(DEFAULT_BRACKET_TRANSFORM);
const DEFAULT_WINNER_TRANSFORMS = { ...makeTransformMap(DEFAULT_WINNER_TRANSFORM), 16: { x: 0, y: 20, scale: 150 } };
const STORAGE_DB = 'bracket-forge-local';
const STORAGE_KEY = 'current-project';

type Transform = { x: number; y: number; scale: number };
type BackgroundPreset = { id: string; name: string; src: string };
type SavedProject = { title: string; titleSize: number; titleFont: string; titleImage: string | null; teams: string[]; roundNames?: Record<string, string>; background: string; winnerImage: string; plateImage: string; bracketTransforms?: Record<number, Transform>; winnerTransforms?: Record<number, Transform>; defaultBracketTransforms?: Record<number, Transform>; defaultWinnerTransforms?: Record<number, Transform>; bracketTransform?: Transform; winnerTransform?: Transform; customBackgrounds: BackgroundPreset[] };

function openStorage() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function loadProject() { const db = await openStorage(); return new Promise<SavedProject | undefined>((resolve, reject) => { const request = db.transaction('projects').objectStore('projects').get(STORAGE_KEY); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function saveProject(project: SavedProject) { const db = await openStorage(); return new Promise<void>((resolve, reject) => { const request = db.transaction('projects', 'readwrite').objectStore('projects').put(project, STORAGE_KEY); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
function readImage(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }

type Node = { side: 'left' | 'right'; round: number; index: number; x: number; y: number; w: number; h: number; label: string; seed: string };
type Line = { x: number; y: number; w: number; h: number; vertical?: boolean; side: 'left' | 'right' };
type VsMark = { x: number; y: number };

function powerOfTwo(value: number) { return 2 ** Math.ceil(Math.log2(Math.max(4, value))); }

function makeLayout(teams: string[], roundNames: Record<string, string>) {
  const size = powerOfTwo(teams.length);
  const slots = Array.from({ length: size }, (_, i) => teams[i] || 'BYE');
  const sideCount = size / 2;
  const boardW = size >= 32 ? WIDE_BOARD_W : BOARD_W;
  const sideRounds = Math.log2(sideCount) + 1;
  const cardW = size >= 32 ? 96 : size === 16 ? 120 : size === 8 ? 154 : 190;
  const cardH = size >= 32 ? 24 : size === 16 ? 70 : size === 8 ? 108 : 124;
  const outerX = size >= 32 ? 12 : size === 16 ? 10 : 38;
  const step = size >= 32 ? 164 : size === 16 ? 170 : size === 8 ? 190 : 250;
  const finalW = 220;
  const finalX = (boardW - finalW) / 2;
  const contentOffset = size === 16 ? 0 : size <= 8 ? 76 : 16;
  const contentHeight = BOARD_H - contentOffset;
  const nodes: Node[] = [];
  const lines: Line[] = [];
  const vs: VsMark[] = [];

  (['left', 'right'] as const).forEach((side) => {
    const sideSlots = side === 'left' ? slots.slice(0, sideCount) : slots.slice(sideCount);
    let previous: Node[] = [];
    for (let round = 0; round < sideRounds; round++) {
      const count = sideCount / 2 ** round;
      const isSideFinal = round === sideRounds - 1;
      const leftX = size === 32 && isSideFinal ? boardW / 2 - cardW - 12 : size === 16 && isSideFinal ? 410 : size < 16 && isSideFinal ? boardW / 2 - cardW - 6 : outerX + step * round;
      const x = side === 'left' ? leftX : boardW - leftX - cardW;
      const current: Node[] = [];
      for (let index = 0; index < count; index++) {
        const centerY = contentOffset + (index + .5) * contentHeight / count;
        const nameKey = `${side}-${round}-${index}`;
        const node = { side, round, index, x, y: centerY - cardH / 2, w: cardW, h: cardH, label: round === 0 ? sideSlots[index] : roundNames[nameKey] ?? `WINNER ${index + 1}`, seed: round === 0 ? String(index + 1).padStart(2, '0') : 'W' };
        nodes.push(node); current.push(node);
      }
      if (round === 0) for (let i = 0; i < current.length; i += 2) vs.push({ x: x + cardW / 2, y: (current[i].y + current[i + 1].y + cardH) / 2 });
      if (previous.length) current.forEach((parent, i) => {
        const a = previous[i * 2], b = previous[i * 2 + 1];
        const ay = a.y + a.h / 2, by = b.y + b.h / 2, py = parent.y + parent.h / 2;
        const embeddedFinal = (size === 16 || size === 32) && round === sideRounds - 1;
        if (side === 'left') {
          const startX = a.x + a.w, joint = embeddedFinal ? parent.x + parent.w / 2 : (startX + parent.x) / 2;
          lines.push({ x: startX, y: ay, w: Math.max(0, joint - startX), h: 2, side }, { x: startX, y: by, w: Math.max(0, joint - startX), h: 2, side }, { x: joint, y: ay, w: 2, h: by - ay, vertical: true, side });
          if (!embeddedFinal) lines.push({ x: joint, y: py, w: parent.x - joint, h: 2, side });
        } else {
          const startX = a.x, targetX = parent.x + parent.w, joint = embeddedFinal ? parent.x + parent.w / 2 : (startX + targetX) / 2;
          lines.push({ x: joint, y: ay, w: Math.max(0, startX - joint), h: 2, side }, { x: joint, y: by, w: Math.max(0, startX - joint), h: 2, side }, { x: joint, y: ay, w: 2, h: by - ay, vertical: true, side });
          if (!embeddedFinal) lines.push({ x: targetX, y: py, w: joint - targetX, h: 2, side });
        }
      });
      previous = current;
    }
  });

  const leftSemi = nodes.find(n => n.side === 'left' && n.round === sideRounds - 1)!;
  const rightSemi = nodes.find(n => n.side === 'right' && n.round === sideRounds - 1)!;
  const winnerY = 0; const winnerH = 104;
  const centerX = boardW / 2;
  const semiCenterY = leftSemi.y + leftSemi.h / 2;
  lines.push({ x: leftSemi.x + leftSemi.w, y: semiCenterY, w: centerX - leftSemi.x - leftSemi.w, h: 3, side: 'left' });
  lines.push({ x: centerX, y: semiCenterY, w: rightSemi.x - centerX, h: 3, side: 'right' });
  lines.push({ x: centerX, y: winnerH - 2, w: 3, h: semiCenterY - winnerH + 2, vertical: true, side: 'left' });
  return { size, boardW, nodes, lines, vs, final: { x: finalX, y: winnerY, w: finalW, h: winnerH }, sideRounds };
}

function Match({ node, onNameChange }: { node: Node; onNameChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  return <div className={`single-node ${node.side} ${node.h <= 24 ? 'compact' : ''} ${editing ? 'editing' : ''}`} style={{ left: node.x, top: node.y, width: node.w, height: node.h }} onPointerDown={(event) => event.stopPropagation()} onClick={() => setEditing(true)} title="クリックして名前を編集">{editing ? <textarea autoFocus rows={node.h <= 24 ? 1 : 2} value={node.label} onChange={(event) => onNameChange(event.target.value)} onFocus={(event) => event.currentTarget.select()} onBlur={() => setEditing(false)} onKeyDown={(event) => { if (event.key === 'Escape') event.currentTarget.blur(); }} aria-label="ブロック名"/> : <b>{node.label}</b>}</div>;
}

export default function Home() {
  const [title, setTitle] = useState('KANON × REV. CUP');
  const [titleSize, setTitleSize] = useState(46);
  const [titleFont, setTitleFont] = useState('sport');
  const [titleImage, setTitleImage] = useState<string | null>(null);
  const [teams, setTeams] = useState(initialTeams);
  const [roundNames, setRoundNames] = useState<Record<string, string>>({});
  const [background, setBackground] = useState(asset('kanon-rev-bg.png'));
  const [winnerImage, setWinnerImage] = useState(asset('winner-brush-gold.png'));
  const [plateImage, setPlateImage] = useState(DEFAULT_PLATE_IMAGE);
  const [bracketTransforms, setBracketTransforms] = useState(() => ({ ...DEFAULT_BRACKET_TRANSFORMS }));
  const [winnerTransforms, setWinnerTransforms] = useState(() => ({ ...DEFAULT_WINNER_TRANSFORMS }));
  const [defaultBracketTransforms, setDefaultBracketTransforms] = useState(() => ({ ...DEFAULT_BRACKET_TRANSFORMS }));
  const [defaultWinnerTransforms, setDefaultWinnerTransforms] = useState(() => ({ ...DEFAULT_WINNER_TRANSFORMS }));
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundPreset[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('読み込み中');
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState<'bracket' | 'winner' | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ active: false, target: 'bracket' as 'bracket' | 'winner', startX: 0, startY: 0, originX: 0, originY: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ distance: 0, scale: 100 });
  const layout = makeLayout(teams, roundNames);
  const defaultBracketTransform = defaultBracketTransforms[layout.size] ?? DEFAULT_BRACKET_TRANSFORM;
  const defaultWinnerTransform = defaultWinnerTransforms[layout.size] ?? DEFAULT_WINNER_TRANSFORM;
  const bracketTransform = bracketTransforms[layout.size] ?? defaultBracketTransform;
  const winnerTransform = winnerTransforms[layout.size] ?? defaultWinnerTransform;
  const setBracketTransform = (value: Transform | ((current: Transform) => Transform)) => setBracketTransforms(all => ({ ...all, [layout.size]: typeof value === 'function' ? value(all[layout.size] ?? defaultBracketTransform) : value }));
  const setWinnerTransform = (value: Transform | ((current: Transform) => Transform)) => setWinnerTransforms(all => ({ ...all, [layout.size]: typeof value === 'function' ? value(all[layout.size] ?? defaultWinnerTransform) : value }));
  useEffect(() => { loadProject().then(saved => { if (saved) { const savedSize = powerOfTwo(saved.teams.length); setTitle(saved.title); setTitleSize(saved.titleSize); setTitleFont(saved.titleFont); setTitleImage(saved.titleImage); setTeams(saved.teams); setRoundNames(saved.roundNames || {}); setBackground(saved.background); setWinnerImage(saved.winnerImage); setPlateImage(saved.plateImage === '/dogtag-plate.png' ? DEFAULT_PLATE_IMAGE : saved.plateImage); setBracketTransforms(saved.bracketTransforms || { ...DEFAULT_BRACKET_TRANSFORMS, [savedSize]: saved.bracketTransform || DEFAULT_BRACKET_TRANSFORMS[savedSize] }); setWinnerTransforms(saved.winnerTransforms || { ...DEFAULT_WINNER_TRANSFORMS, [savedSize]: saved.winnerTransform || DEFAULT_WINNER_TRANSFORMS[savedSize] }); setDefaultBracketTransforms(saved.defaultBracketTransforms || DEFAULT_BRACKET_TRANSFORMS); setDefaultWinnerTransforms(saved.defaultWinnerTransforms || DEFAULT_WINNER_TRANSFORMS); setCustomBackgrounds(saved.customBackgrounds || []); } setStorageReady(true); setSaveStatus('保存済み'); }).catch(() => { setStorageReady(true); setSaveStatus('保存を利用できません'); }); }, []);
  useEffect(() => { if (!storageReady) return; setSaveStatus('保存中…'); const timer = window.setTimeout(() => { saveProject({ title, titleSize, titleFont, titleImage, teams, roundNames, background, winnerImage, plateImage, bracketTransforms, winnerTransforms, defaultBracketTransforms, defaultWinnerTransforms, customBackgrounds }).then(() => setSaveStatus('保存済み')).catch(() => setSaveStatus('保存容量を確認してください')); }, 250); return () => window.clearTimeout(timer); }, [storageReady, title, titleSize, titleFont, titleImage, teams, roundNames, background, winnerImage, plateImage, bracketTransforms, winnerTransforms, defaultBracketTransforms, defaultWinnerTransforms, customBackgrounds]);
  const updateCount = (count: number) => setTeams(Array.from({ length: count }, (_, i) => teams[i] || `CHALLENGER ${i + 1}`));
  const uploadBackground = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const src = await readImage(file); const preset = { id: `${Date.now()}`, name: file.name.replace(/\.[^.]+$/, ''), src }; setCustomBackgrounds(items => [...items, preset]); setBackground(src); event.target.value = ''; };
  const uploadAsset = (setter: (value: string) => void) => async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setter(await readImage(file)); event.target.value = ''; };
  const startDrag = (target: 'bracket' | 'winner', event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const current = target === 'bracket' ? bracketTransform : winnerTransform;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) { const [a,b] = [...pointersRef.current.values()]; pinchRef.current = { distance: Math.hypot(a.x-b.x,a.y-b.y), scale: current.scale }; }
    dragRef.current = { active: true, target, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y };
    setDragging(target);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const target = dragRef.current.target;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [a,b] = [...pointersRef.current.values()]; const distance = Math.hypot(a.x-b.x,a.y-b.y);
      const limits = target === 'bracket' ? [55,145] : [40,200];
      const scale = Math.max(limits[0], Math.min(limits[1], Math.round(pinchRef.current.scale * distance / Math.max(1,pinchRef.current.distance))));
      const setter = target === 'bracket' ? setBracketTransform : setWinnerTransform; setter(current => ({ ...current, scale })); return;
    }
    const board = event.currentTarget.closest('.board-inner') as HTMLElement | null;
    const ratio = board ? layout.boardW / board.getBoundingClientRect().width : 1;
    let x = Math.round(dragRef.current.originX + (event.clientX - dragRef.current.startX) * ratio);
    let y = Math.round(dragRef.current.originY + (event.clientY - dragRef.current.startY) * ratio);
    if (Math.abs(x) <= 18) x = 0; if (Math.abs(y) <= 18) y = 0;
    const setter = target === 'bracket' ? setBracketTransform : setWinnerTransform;
    setter(current => ({ ...current, x, y }));
  };
  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => { pointersRef.current.delete(event.pointerId); dragRef.current.active = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(null); };
  const zoomWithWheel = (target: 'bracket' | 'winner', event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); const setter = target === 'bracket' ? setBracketTransform : setWinnerTransform; const limits = target === 'bracket' ? [55,145] : [40,200];
    setter(current => ({ ...current, scale: Math.max(limits[0], Math.min(limits[1], current.scale + (event.deltaY < 0 ? 5 : -5))) }));
  };
  const downloadTournamentImage = async () => {
    if (!sheetRef.current || exporting) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(sheetRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      const filename = (title.trim() || 'tournament').replace(/[\\/:*?"<>|]/g, '_');
      link.download = `${filename}-bracket.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Tournament image export failed', error);
      window.alert('画像の作成に失敗しました。もう一度お試しください。');
    } finally {
      setExporting(false);
    }
  };

  return <main className="app-shell">
    <aside className="editor no-print">
      <div className="editor-brand"><span>BF</span><div><b>BRACKET FORGE</b><small>SINGLE ELIMINATION</small></div></div>
      <p className="section-label">EVENT SETTINGS</p>
      <label>大会タイトル<input value={title} onChange={(e) => setTitle(e.target.value)}/></label>
      <div className="title-controls">
        <label>文字サイズ<input type="number" min="20" max="96" value={titleSize} onChange={(e) => setTitleSize(Math.max(20, Math.min(96, Number(e.target.value) || 20)))}/></label>
        <label>フォント<select value={titleFont} onChange={(e) => setTitleFont(e.target.value)}><option value="sport">スポーツ太字</option><option value="gothic">角ゴシック</option><option value="mincho">明朝</option><option value="brush">筆文字</option></select></label>
      </div>
      <label className="upload"><input type="file" accept="image/*" onChange={uploadAsset(value => setTitleImage(value))}/><b>タイトル画像を選ぶ</b><span>PNG / WEBP</span></label>
      {titleImage && <button className="reset" onClick={() => setTitleImage(null)}>文字タイトルに戻す</button>}
      <label>参加チーム数</label>
      <div className="presets">{presets.map(n => <button key={n} className={teams.length === n ? 'active' : ''} onClick={() => updateCount(n)}><b>{n}</b><small>TEAMS</small></button>)}</div>
      <p className="section-label">BACKGROUND PRESETS</p>
      <div className="background-presets">{[...defaultBackgrounds, ...customBackgrounds].map(item => <div key={item.id} className={background === item.src ? 'active' : ''}><button className="preset-image" onClick={() => setBackground(item.src)} style={{ backgroundImage: `url(${item.src})` }} aria-label={`${item.name}を使用`}/><span>{item.name}</span>{!defaultBackgrounds.some(p => p.id === item.id) && <button className="preset-delete" onClick={() => { setCustomBackgrounds(items => items.filter(p => p.id !== item.id)); if (background === item.src) setBackground(asset('kanon-rev-bg.png')); }} aria-label={`${item.name}を削除`}>×</button>}</div>)}</div>
      <label className="upload"><input type="file" accept="image/*" onChange={uploadBackground}/><b>背景を追加・保存</b><span>PNG / JPG</span></label>
      <p className="section-label">BLOCK PRESETS</p>
      <div className="plate-presets">{defaultPlateImages.map(item => <button key={item.id} className={plateImage === item.src ? 'active' : ''} onClick={() => setPlateImage(item.src)}><img src={item.src} alt=""/><span>{item.name}</span></button>)}</div>
      <label className="upload"><input type="file" accept="image/*" onChange={uploadAsset(setPlateImage)}/><b>ブロック画像を変更</b><span>PNG / WEBP</span></label>
      <p className="section-label">WINNER IMAGE</p>
      <div className="winner-presets">{defaultWinnerImages.map(item => <button key={item.id} className={winnerImage === item.src ? 'active' : ''} onClick={() => setWinnerImage(item.src)}><img src={item.src} alt=""/><span>{item.name}</span></button>)}</div>
      <label className="upload"><input type="file" accept="image/*" onChange={uploadAsset(setWinnerImage)}/><b>WINNER画像を変更</b><span>透過PNG推奨</span></label>
      <button className="save-default" onClick={() => { setDefaultBracketTransforms(values => ({ ...values, [layout.size]: { ...bracketTransform } })); setDefaultWinnerTransforms(values => ({ ...values, [layout.size]: { ...winnerTransform } })); setSaveStatus(`${layout.size}チームの標準位置を保存`); }}>現在位置をこのチーム数のデフォルトにする</button>
      <button className="reset" onClick={() => { setBracketTransform(defaultBracketTransform); setWinnerTransform(defaultWinnerTransform); setPlateImage(DEFAULT_PLATE_IMAGE); setWinnerImage(asset('winner-brush-gold.png')); }}>現在のチーム数の配置と素材をリセット</button>
      <p className="direct-edit-hint">チーム名はトーナメント上のブロックをクリックして直接変更できます。</p>
      <button className="download" onClick={downloadTournamentImage} disabled={exporting}><span>{exporting ? 'CREATING IMAGE…' : 'DOWNLOAD PNG'}</span><b>{exporting ? 'しばらくお待ちください' : '完成画像をPCに保存'}</b></button>
      <button className="print" onClick={() => window.print()}><span>PRINT / PDF</span><b>A4 横向きで出力</b></button>
      <p className={`save-status ${saveStatus !== '保存済み' ? 'working' : ''}`}>● {saveStatus} — このブラウザ内</p>
    </aside>

    <section className="stage">
      <header className="toolbar no-print"><span><i/> LIVE BRACKET</span><b>{layout.size} DRAW / A4 LANDSCAPE</b><button onClick={() => window.print()}>印刷プレビュー</button></header>
      <div className="canvas-wrap">
        <article ref={sheetRef} className="sheet" style={{ backgroundImage: `url(${background})` }}>
          <header className="sheet-title" style={{ '--title-size': `${titleSize}px` } as CSSProperties}><small>OFFICIAL SINGLE ELIMINATION BRACKET</small>{titleImage ? <img className="title-image" src={titleImage} alt={title || '大会タイトル'}/> : <h1 style={{ fontFamily: titleFonts[titleFont] }}>{title}</h1>}<div><span>ROUND OF {layout.size}</span><b>{teams.length} CHALLENGERS</b><span>ONE CHAMPION</span></div></header>
          <div className="bracket-board" style={{ '--scale-x': '1', '--scale-y': '1' } as CSSProperties}>
            <div className={`board-inner ${layout.size >= 32 ? 'size32' : ''}`} style={{ '--plate-image': `url(${plateImage})` } as CSSProperties}>
              {dragging && (dragging === 'bracket' ? bracketTransform.x === 0 : winnerTransform.x === 0) && <span className="snap-guide vertical"/>}
              {dragging && (dragging === 'bracket' ? bracketTransform.y === 0 : winnerTransform.y === 0) && <span className="snap-guide horizontal"/>}
              <div className={`bracket-layer draggable ${dragging === 'bracket' ? 'dragging' : ''}`} title="ドラッグで移動・ホイールで拡大縮小" onWheel={e => zoomWithWheel('bracket',e)} onPointerDown={e => startDrag('bracket', e)} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} style={{ transform: `translate(${bracketTransform.x}px, ${bracketTransform.y}px) scale(${bracketTransform.scale / 100})` }}>
                {layout.lines.map((line, i) => <span key={i} className={`connector ${line.side} ${line.vertical ? 'vertical' : ''}`} style={{ left: line.x, top: line.y, width: line.w, height: line.h }}/>) }
                {layout.nodes.map((node, i) => <Match key={i} node={node} onNameChange={(value) => { if (node.round === 0) { const teamIndex = node.side === 'left' ? node.index : layout.size / 2 + node.index; setTeams(items => items.map((name, index) => index === teamIndex ? value : name)); } else { const key = `${node.side}-${node.round}-${node.index}`; setRoundNames(names => ({ ...names, [key]: value })); } }}/>) }
              </div>
              <div className={`champion draggable ${dragging === 'winner' ? 'dragging' : ''}`} title="ドラッグで移動・ホイールで拡大縮小" onWheel={e => zoomWithWheel('winner',e)} onPointerDown={e => startDrag('winner', e)} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} style={{ left: layout.final.x, top: layout.final.y, width: layout.final.w, height: layout.final.h, transform: `translate(${winnerTransform.x}px, ${winnerTransform.y}px) scale(${winnerTransform.scale / 100})` }}><img src={winnerImage} alt="WINNER" draggable={false} /></div>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>;
}
