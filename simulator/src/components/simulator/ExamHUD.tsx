import { useState } from 'react'
import { useSimStore, live } from '../../store/simulatorStore'
import { handles } from './handles'
import { PASS_PENALTY, RULE_LIST, ruleKind } from '../../systems/ExamRules'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Imtihon paneli: ball, vaqt, mashq, xatolar; kamar / ko'rsatkich / avariya tugmalari; 32 qoida va natija oynasi. */
export function ExamHUD({ onExit }: { onExit: () => void }) {
  const ex = useSimStore((s) => s.exam)
  const [rules, setRules] = useState(false)
  const errs = Object.values(ex.mistakes).reduce((a, b) => a + b, 0)
  const tog = (k: 'belt' | 'hazard') => useSimStore.setState((s) => ({ exam: { ...s.exam, [k]: !s.exam[k] } }))
  const setSig = (d: -1 | 1) => useSimStore.setState((s) => ({ exam: { ...s.exam, signal: s.exam.signal === d ? 0 : d } }))
  const restart = () => { handles.examRules?.reset(); live.resetRequested = true }
  const left = Math.max(0, ex.limit - ex.t)
  return (
    <>
      <div className="exam-bar glass">
        <div className={ex.pen >= 60 ? 'bad' : ex.pen ? 'warn' : ''}><small>BALL</small><b>{ex.pen}<i>/{PASS_PENALTY}</i></b></div>
        <div className={left < 60 ? 'warn' : ''}><small>VAQT</small><b>{fmt(ex.t)}</b></div>
        <div><small>MASHQ</small><b>{Math.min(ex.cp + 1, ex.total)}<i>/{ex.total}</i></b></div>
        <div className={errs ? 'bad' : ''}><small>XATOLAR</small><b>{errs}</b></div>
      </div>
      <div className="exam-tip glass">{ex.text}</div>
      {ex.alert && <div className={`exam-alert ${ex.alert.startsWith('AVARIYA') ? 'red' : ''}`}>{ex.alert}</div>}
      <div className="exam-sig">
        <button className={ex.belt ? 'on belt' : 'belt-off'} onClick={() => tog('belt')} title="Xavfsizlik kamari (B)">KAMAR</button>
        <button className={ex.signal === -1 ? 'on' : ''} onClick={() => setSig(-1)} title="Chap burilish ko'rsatkichi (Q)">◀ Q</button>
        <button className={ex.hazard ? 'on haz' : ''} onClick={() => tog('hazard')} title="Avariya chirog'i (H)">⚠ H</button>
        <button className={ex.signal === 1 ? 'on' : ''} onClick={() => setSig(1)} title="O'ng burilish ko'rsatkichi (E)">E ▶</button>
      </div>
      <button className="exam-rules-btn glass" onClick={() => setRules(true)}>32 ta qoida</button>
      {rules && (
        <div className="exam-res-bg" onClick={() => setRules(false)}>
          <div className="exam-res glass exam-rl" onClick={(e) => e.stopPropagation()}>
            <div className="er-t"><b>Jarima ballari jadvali</b></div>
            <p className="er-r" style={{ color: 'var(--mut)', fontWeight: 600 }}>32 ta xato. Jami {PASS_PENALTY} ballga yetsa — imtihon yiqilgan.</p>
            <ul className="er-l">{RULE_LIST.map((r) => <li key={r.n}><span><em>#{r.n}</em> {r.text}</span><b className={r.pts >= 100 ? 'k3' : r.pts > 10 ? 'k2' : 'k1'} title={ruleKind(r.pts)}>−{r.pts}</b></li>)}</ul>
            <div className="er-b"><button className="go" onClick={() => setRules(false)}>Yopish</button></div>
          </div>
        </div>
      )}
      {ex.done && (
        <div className="exam-res-bg">
          <div className="exam-res glass">
            <div className={`er-t ${ex.passed ? 'ok' : 'no'}`}><span>{ex.passed ? '✓' : '✕'}</span><b>{ex.passed ? "Imtihondan o'tdingiz" : "Imtihondan o'tolmadingiz"}</b></div>
            <div className="er-n"><div><b className={ex.passed ? 'ok' : 'no'}>{ex.pen}</b><small>/{PASS_PENALTY} jarima balli</small></div><div><b>{fmt(ex.t)}</b><small>vaqt</small></div><div><b>{ex.cp}/{ex.total}</b><small>mashq</small></div></div>
            {ex.reason && <p className="er-r">{ex.reason}</p>}
            {errs === 0 ? <p className="er-ok">Bitta ham xato yo'q</p> : <ul className="er-l">{Object.entries(ex.mistakes).map(([k, v]) => <li key={k}><span>{k}</span><b>×{v}</b></li>)}</ul>}
            <div className="er-b"><button className="glass" onClick={onExit}>Chiqish</button><button className="go" onClick={restart}>Qayta boshlash</button></div>
          </div>
        </div>
      )}
    </>
  )
}
