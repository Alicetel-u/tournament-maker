'use client';

import { ChangeEvent, CSSProperties, useState } from 'react';

const presets = [4, 8, 16, 32];
const initialTeams = ['STELLAR PINK', 'NOVA RUSH', 'BLUE IGNITION', 'VOLT CREW', 'CYBER BLOOM', 'NEON EDGE', 'RAPID BEAT', 'ZERO LIMIT'];
const BOARD_W = 1080;
const BOARD_H = 500;

type Node = { side: 'left' | 'right'; round: number; index: number; x: number; y: number; w: number; h: number; top: string; bottom: string };
type Line = { x: number; y: number; w: number; h: number; vertical?: boolean; side: 'left' | 'right' };

function powerOfTwo(value: number) { return 2 ** Math.ceil(Math.log2(Math.max(4, value))); }

function makeLayout(teams: string[]) {
  const size = powerOfTwo(teams.length);
  const slots = Array.from({ length: size }, (_, i) => teams[i] || 'BYE');
  const sideRounds = Math.log2(size) - 1;
  const cardW = size >= 32 ? 104 : size >= 16 ? 122 : 146;
  const cardH = size >= 32 ? 46 : size >= 16 ? 56 : 70;
  const outerX = size >= 16 ? 18 : 34;
  const finalW = 164;
  const finalX = (BOARD_W - finalW) / 2;
  const leftLimit = finalX - 30;
  const available = leftLimit - outerX - cardW;
  const step = sideRounds > 1 ? available / (sideRounds - 1) : available;
  const nodes: Node[] = [];
  const lines: Line[] = [];

  (['left', 'right'] as const).forEach((side) => {
    const sideSlots = side === 'left' ? slots.slice(0, size / 2) : slots.slice(size / 2);
    for (let round = 0; round < sideRounds; round++) {
      const count = sideSlots.length / 2 ** (round + 1);
      const leftX = outerX + step * round;
      const x = side === 'left' ? leftX : BOARD_W - leftX - cardW;
      for (let index = 0; index < count; index++) {
        const centerY = (index + .5) * BOARD_H / count;
        const top = round === 0 ? sideSlots[index * 2] : `WINNER ${index * 2 + 1}`;
        const bottom = round === 0 ? sideSlots[index * 2 + 1] : `WINNER ${index * 2 + 2}`;
        nodes.push({ side, round, index, x, y: centerY - cardH / 2, w: cardW, h: cardH, top, bottom });
      }
    }
  });

  (['left', 'right'] as const).forEach((side) => {
    for (let round = 0; round < sideRounds - 1; round++) {
      const children = nodes.filter(n => n.side === side && n.round === round);
      const parents = nodes.filter(n => n.side === side && n.round === round + 1);
      parents.forEach((parent, i) => {
        const a = children[i * 2]; const b = children[i * 2 + 1];
        const aY = a.y + a.h / 2; const bY = b.y + b.h / 2; const parentY = parent.y + parent.h / 2;
        if (side === 'left') {
          const joint = (a.x + a.w + parent.x) / 2;
          lines.push({ x: a.x + a.w, y: aY, w: joint - (a.x + a.w), h: 2, side }, { x: b.x + b.w, y: bY, w: joint - (b.x + b.w), h: 2, side }, { x: joint, y: aY, w: 2, h: bY - aY, vertical: true, side }, { x: joint, y: parentY, w: parent.x - joint, h: 2, side });
        } else {
          const joint = (a.x + (parent.x + parent.w)) / 2;
          lines.push({ x: joint, y: aY, w: a.x - joint, h: 2, side }, { x: joint, y: bY, w: b.x - joint, h: 2, side }, { x: joint, y: aY, w: 2, h: bY - aY, vertical: true, side }, { x: parent.x + parent.w, y: parentY, w: joint - (parent.x + parent.w), h: 2, side });
        }
      });
    }
  });

  const leftSemi = nodes.find(n => n.side === 'left' && n.round === sideRounds - 1)!;
  const rightSemi = nodes.find(n => n.side === 'right' && n.round === sideRounds - 1)!;
  const finalY = BOARD_H / 2;
  lines.push({ x: leftSemi.x + leftSemi.w, y: finalY, w: finalX - (leftSemi.x + leftSemi.w), h: 2, side: 'left' });
  lines.push({ x: finalX + finalW, y: finalY, w: rightSemi.x - (finalX + finalW), h: 2, side: 'right' });
  return { size, nodes, lines, final: { x: finalX, y: finalY - 46, w: finalW, h: 92 }, sideRounds };
}

function Match({ node }: { node: Node }) {
  return <div className={`match-node ${node.side}`} style={{ left: node.x, top: node.y, width: node.w, height: node.h }}>
    <div className="entrant top"><span>{node.round === 0 ? String(node.index * 2 + 1).padStart(2, '0') : 'W'}</span><b>{node.top}</b><i>—</i></div>
    <div className="vs-line"><em>VS</em></div>
    <div className="entrant bottom"><span>{node.round === 0 ? String(node.index * 2 + 2).padStart(2, '0') : 'W'}</span><b>{node.bottom}</b><i>—</i></div>
  </div>;
}

export default function Home() {
  const [title, setTitle] = useState('KANON × REV. CUP');
  const [teams, setTeams] = useState(initialTeams);
  const [background, setBackground] = useState('/kanon-rev-bg.png');
  const layout = makeLayout(teams);
  const updateCount = (count: number) => setTeams(Array.from({ length: count }, (_, i) => teams[i] || `CHALLENGER ${i + 1}`));
  const upload = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setBackground(URL.createObjectURL(file)); };

  return <main className="app-shell">
    <aside className="editor no-print">
      <div className="editor-brand"><span>BF</span><div><b>BRACKET FORGE</b><small>SINGLE ELIMINATION</small></div></div>
      <p className="section-label">EVENT SETTINGS</p>
      <label>大会タイトル<input value={title} onChange={(e) => setTitle(e.target.value)}/></label>
      <label>参加チーム数</label>
      <div className="presets">{presets.map(n => <button key={n} className={teams.length === n ? 'active' : ''} onClick={() => updateCount(n)}><b>{n}</b><small>TEAMS</small></button>)}</div>
      <label className="upload"><input type="file" accept="image/*" onChange={upload}/><b>背景画像を変更</b><span>PNG / JPG</span></label>
      {background !== '/kanon-rev-bg.png' && <button className="reset" onClick={() => setBackground('/kanon-rev-bg.png')}>デフォルト背景に戻す</button>}
      <div className="roster-head"><p className="section-label">TEAM ROSTER</p><button onClick={() => setTeams(t => [...t, `CHALLENGER ${t.length + 1}`])}>＋ ADD</button></div>
      <div className="roster">{teams.map((team, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><input value={team} onChange={(e) => setTeams(t => t.map((v, n) => n === i ? e.target.value : v))}/><button onClick={() => setTeams(t => t.filter((_, n) => n !== i))}>×</button></div>)}</div>
      <button className="print" onClick={() => window.print()}><span>PRINT / PDF</span><b>A4 横向きで出力</b></button>
    </aside>

    <section className="stage">
      <header className="toolbar no-print"><span><i/> LIVE BRACKET</span><b>{layout.size} DRAW / A4 LANDSCAPE</b><button onClick={() => window.print()}>印刷プレビュー</button></header>
      <div className="canvas-wrap">
        <article className="sheet" style={{ backgroundImage: `url(${background})` }}>
          <header className="sheet-title"><small>OFFICIAL SINGLE ELIMINATION BRACKET</small><h1>{title}</h1><div><span>ROUND OF {layout.size}</span><b>{teams.length} CHALLENGERS</b><span>ONE CHAMPION</span></div></header>
          <div className="bracket-board" style={{ '--scale-x': '1', '--scale-y': '1' } as CSSProperties}>
            <div className="board-inner">
              {layout.lines.map((line, i) => <span key={i} className={`connector ${line.side} ${line.vertical ? 'vertical' : ''}`} style={{ left: line.x, top: line.y, width: line.w, height: line.h }}/>) }
              {layout.nodes.map((node, i) => <Match key={i} node={node}/>) }
              <div className="final-label" style={{ left: layout.final.x, top: layout.final.y - 28, width: layout.final.w }}>GRAND FINAL</div>
              <div className="final-node" style={{ left: layout.final.x, top: layout.final.y, width: layout.final.w, height: layout.final.h }}>
                <div className="entrant top"><span>L</span><b>LEFT FINALIST</b><i>—</i></div><div className="vs-line"><em>VS</em></div><div className="entrant bottom"><span>R</span><b>RIGHT FINALIST</b><i>—</i></div>
              </div>
              <div className="champion" style={{ left: layout.final.x, top: layout.final.y + layout.final.h + 20, width: layout.final.w }}><small>TOURNAMENT</small><b>CHAMPION</b></div>
            </div>
          </div>
          <footer><span>PINK DIVISION</span><b>WINNERS ADVANCE ALONG THE CONNECTED PATH</b><span>CYAN DIVISION</span></footer>
        </article>
      </div>
    </section>
  </main>;
}
