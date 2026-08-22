'use client';

import { ChangeEvent, useState } from 'react';

const presets = [4, 8, 16, 32];
const initialTeams = ['STELLAR PINK', 'NOVA RUSH', 'BLUE IGNITION', 'VOLT CREW', 'CYBER BLOOM', 'NEON EDGE', 'RAPID BEAT', 'ZERO LIMIT'];

function nextPowerOfTwo(value: number) { return 2 ** Math.ceil(Math.log2(Math.max(2, value))); }
function roundTitle(index: number, total: number) {
  const left = total / 2 ** (index + 1);
  if (left === 1) return 'GRAND FINAL';
  if (left === 2) return 'SEMI FINAL';
  if (left === 4) return 'QUARTER FINAL';
  return `ROUND ${index + 1}`;
}

function MatchCard({ top, bottom, round, index }: { top: string; bottom: string; round: number; index: number }) {
  return <div className={`match-card ${round === 0 ? 'live' : ''}`}>
    <span className="corner corner-a"/><span className="corner corner-b"/>
    <div className="match-no">MATCH {String(index + 1).padStart(2, '0')}</div>
    <div className="team-row pink"><span className="seed">{round === 0 ? String(index * 2 + 1).padStart(2, '0') : 'W'}</span><strong>{top}</strong><b>—</b></div>
    <div className="versus">VS</div>
    <div className="team-row cyan"><span className="seed">{round === 0 ? String(index * 2 + 2).padStart(2, '0') : 'W'}</span><strong>{bottom}</strong><b>—</b></div>
  </div>;
}

export default function Home() {
  const [title, setTitle] = useState('KANON × REV. CUP');
  const [teams, setTeams] = useState(initialTeams);
  const [background, setBackground] = useState('/kanon-rev-bg.png');
  const bracketSize = nextPowerOfTwo(teams.length);
  const rounds = Math.log2(bracketSize);
  const slots = Array.from({ length: bracketSize }, (_, i) => teams[i] || 'BYE');
  const setCount = (count: number) => setTeams(Array.from({ length: count }, (_, i) => teams[i] || `NEW CHALLENGER ${i + 1}`));
  const changeTeam = (index: number, value: string) => setTeams((items) => items.map((item, i) => i === index ? value : item));
  const uploadBackground = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setBackground(URL.createObjectURL(file)); };

  return <main className="app-shell">
    <aside className="editor no-print">
      <div className="editor-brand"><span className="mini-logo">BRKT</span><div><b>BRACKET FORGE</b><small>TOURNAMENT DESIGNER</small></div></div>
      <section>
        <p className="section-label">01 / EVENT</p>
        <label>大会タイトル<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>参加チーム数</label>
        <div className="preset-grid">{presets.map((count) => <button key={count} className={teams.length === count ? 'selected' : ''} onClick={() => setCount(count)}><b>{count}</b><span>TEAMS</span></button>)}</div>
        <label className="bg-button"><input type="file" accept="image/*" onChange={uploadBackground}/><span>背景画像を変更</span><small>PNG / JPG</small></label>
        {background !== '/kanon-rev-bg.png' && <button className="reset-bg" onClick={() => setBackground('/kanon-rev-bg.png')}>デフォルト背景に戻す</button>}
      </section>
      <section className="roster-section">
        <div className="roster-title"><p className="section-label">02 / ROSTER</p><button onClick={() => setTeams((items) => [...items, `NEW CHALLENGER ${items.length + 1}`])}>＋ ADD</button></div>
        <div className="roster">{teams.map((team, i) => <div className="roster-row" key={i}><span>{String(i + 1).padStart(2, '0')}</span><input value={team} onChange={(e) => changeTeam(i, e.target.value)}/><button aria-label={`${team}を削除`} onClick={() => setTeams((items) => items.filter((_, n) => n !== i))}>×</button></div>)}</div>
      </section>
      <button className="print-cta" onClick={() => window.print()}><span>PRINT / PDF</span><b>A4 横向きで出力</b></button>
    </aside>

    <section className="stage">
      <header className="toolbar no-print"><div><i/> LIVE CANVAS <span>A4 LANDSCAPE</span></div><button onClick={() => window.print()}>印刷プレビュー</button></header>
      <div className="canvas-wrap">
        <article className="tournament-sheet" style={{ backgroundImage: `url(${background})` }}>
          <div className="edge-line top"/><div className="edge-line bottom"/>
          <header className="sheet-header">
            <div className="header-rule"><span>OFFICIAL TOURNAMENT</span><i/></div>
            <h1>{title}</h1>
            <div className="header-meta"><span>⚡ SINGLE ELIMINATION</span><b>{String(teams.length).padStart(2, '0')} PLAYERS</b><span>2026 / FINAL STAGE</span></div>
          </header>
          <div className="bracket-frame">
            <div className="frame-notch left">PINK SIDE</div><div className="frame-notch right">CYAN SIDE</div>
            <div className="bracket" style={{ gridTemplateColumns: `repeat(${rounds}, minmax(130px, 1fr))` }}>
              {Array.from({ length: rounds }, (_, round) => {
                const count = bracketSize / 2 ** (round + 1);
                return <section className="round" key={round}>
                  <h2><span>0{round + 1}</span>{roundTitle(round, bracketSize)}</h2>
                  <div className="matches">{Array.from({ length: count }, (_, index) => {
                    const top = round === 0 ? slots[index * 2] : `WINNER ${index * 2 + 1}`;
                    const bottom = round === 0 ? slots[index * 2 + 1] : `WINNER ${index * 2 + 2}`;
                    return <MatchCard key={index} top={top} bottom={bottom} round={round} index={index}/>;
                  })}</div>
                </section>;
              })}
            </div>
          </div>
          <footer className="sheet-footer"><span>KANON <i>×</i> REV.</span><b>WHO WILL BREAK THE LIMIT?</b><span>BRACKET FORGE / 2026</span></footer>
        </article>
      </div>
    </section>
  </main>;
}
