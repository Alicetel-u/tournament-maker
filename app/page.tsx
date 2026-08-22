'use client';

import { ChangeEvent, useMemo, useState } from 'react';

const presets = [4, 8, 16, 32];
const defaultTeams = ['Blue Falcons', 'Crimson Stars', 'North Wolves', 'Golden Hawks', 'Orion FC', 'Sakura United', 'Metro Lions', 'Tide Rovers'];

function nextPowerOfTwo(value: number) { return 2 ** Math.ceil(Math.log2(Math.max(2, value))); }
function roundName(index: number, total: number) {
  const remaining = total / 2 ** (index + 1);
  if (remaining === 1) return '決勝'; if (remaining === 2) return '準決勝'; if (remaining === 4) return '準々決勝'; return `ROUND ${index + 1}`;
}

export default function Home() {
  const [title, setTitle] = useState('SUMMER CUP 2026');
  const [teams, setTeams] = useState(defaultTeams);
  const [background, setBackground] = useState<string | null>(null);
  const [accent, setAccent] = useState('#ff6b35');
  const [printMode, setPrintMode] = useState(false);
  const bracketSize = nextPowerOfTwo(teams.length);
  const rounds = Math.log2(bracketSize);
  const slots = Array.from({ length: bracketSize }, (_, i) => teams[i] || 'BYE');
  const matches = useMemo(() => Array.from({ length: bracketSize / 2 }, (_, i) => [slots[i * 2], slots[i * 2 + 1]]), [bracketSize, teams]);
  const addTeam = () => setTeams((items) => [...items, `TEAM ${items.length + 1}`]);
  const setTeamCount = (count: number) => setTeams(Array.from({ length: count }, (_, i) => teams[i] || `TEAM ${i + 1}`));
  const updateTeam = (index: number, value: string) => setTeams((items) => items.map((item, i) => i === index ? value : item));
  const uploadBackground = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setBackground(URL.createObjectURL(file)); };

  return <main className={printMode ? 'app print-mode' : 'app'} style={{ '--accent': accent } as React.CSSProperties}>
    <aside className="control-panel no-print">
      <div className="brand"><span className="brand-mark">T</span><span>TOURNAMENT<br/><b>MAKER</b></span></div>
      <div className="eyebrow">大会設定</div>
      <label className="field-label">大会タイトル<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="field-label">チーム数<div className="preset-grid">{presets.map((count) => <button key={count} className={teams.length === count ? 'active' : ''} onClick={() => setTeamCount(count)}>{count} TEAM</button>)}</div></div>
      <div className="field-label">アクセントカラー<input className="color" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></div>
      <label className="upload"><input type="file" accept="image/*" onChange={uploadBackground} />▧ 背景画像を選ぶ</label>
      {background && <button className="remove-bg" onClick={() => setBackground(null)}>背景画像を外す</button>}
      <div className="divider" />
      <div className="team-heading"><span>参加チーム</span><button onClick={addTeam}>＋ 追加</button></div>
      <div className="team-list">{teams.map((team, i) => <label key={i}><span>{String(i + 1).padStart(2, '0')}</span><input value={team} onChange={(e) => updateTeam(i, e.target.value)} /><button aria-label="チームを削除" onClick={() => setTeams((items) => items.filter((_, index) => index !== i))}>×</button></label>)}</div>
      <button className="print-button" onClick={() => window.print()}>🖨 A4で印刷する</button>
    </aside>
    <section className="workspace">
      <header className="topbar no-print"><span>トーナメントを編集</span><div><button onClick={() => setPrintMode(!printMode)}>{printMode ? '編集画面に戻る' : 'プレビュー'}</button><button className="share">共有</button></div></header>
      <div className="paper-wrap"><article className="paper" style={background ? { backgroundImage: `linear-gradient(110deg, rgba(10,18,32,.91), rgba(10,18,32,.67)), url(${background})` } : {}}>
        <div className="paper-top"><div><p className="edition">OFFICIAL BRACKET / 2026</p><h1>{title}</h1><p className="subtitle">KNOCKOUT TOURNAMENT</p></div><div className="event-meta"><b>{teams.length} TEAMS</b><span>Single Elimination</span></div></div>
        <div className="bracket" style={{ gridTemplateColumns: `repeat(${rounds}, minmax(134px, 1fr))` }}>{Array.from({ length: rounds }, (_, round) => { const count = bracketSize / 2 ** (round + 1); return <div className="round" key={round}><h2>{roundName(round, bracketSize)}</h2><div className="match-stack" style={{ justifyContent: count === 1 ? 'center' : 'space-around' }}>{Array.from({ length: count }, (_, index) => round === 0 ? <div className="match" key={index}><span>{matches[index][0]}</span><i>—</i><span>{matches[index][1]}</span><i>—</i></div> : <div className="future-match" key={index}><span>Winner M{index * 2 + 1}</span><i>—</i><span>Winner M{index * 2 + 2}</span><i>—</i></div>)}</div></div>; })}</div>
        <footer><span>TOURNAMENT MAKER</span><span>Print-ready A4 / {new Date().getFullYear()}</span></footer>
      </article></div>
    </section>
  </main>;
}
