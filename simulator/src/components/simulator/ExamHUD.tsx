import { useSimStore } from '../../store/simulatorStore'
import { handles } from './handles'
import { live } from '../../store/simulatorStore'
import { PASS_PENALTY } from '../../systems/ExamRules'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Imtihon paneli: marshrut, vaqt, xatolar, keyingi ko'rsatma, burilish ko'rsatkichi va natija oynasi. */
export function ExamHUD({ onExit }: { onExit: () => void }) {
  const ex = useSimStore((s) => s.exam)
  const score = useSimStore((s) => s.score)
  const errs = Object.values(ex.mistakes).reduce((a, b) => a + b, 0)
  const pen = 100 - score
  const setSig = (d: -1 | 1) => useSimStore.setState((s) => ({ exam: { ...s.exam, signal: s.exam.signal === d ? 0 : d } }))
  const restart = () => { handles.examRules?.reset(); live.resetRequested = true }
  const left = Math.max(0, ex.limit - ex.t)
  return (
    <>
      <div className="exam-bar glass">
        <div><small>MARSHRUT</small><b>{ex.cp}/{ex.total}</b></div>
        <div className={left < 60 ? 'warn' : ''}><small>VAQT</small><b>{ex.started ? fmt(ex.t) : fmt(0)}</b></div>
        <div className={errs ? 'bad' : ''}><small>XATOLAR</small><b>{errs}</b></div>
        <div className={pen > PASS_PENALTY ? 'bad' : ''}><small>JARIMA</small><b>{pen}</b></div>
      </div>
      <div className="exam-tip glass">{ex.started ? ex.text : "Harakatni boshlang: taymer yura boshlaydi. " + ex.text}</div>
      <div className="exam-sig">
        <button className={ex.signal === -1 ? 'on' : ''} onClick={() => setSig(-1)} title="Chap burilish ko'rsatkichi (Q)">◀ Q</button>
        <button className={ex.signal === 1 ? 'on' : ''} onClick={() => setSig(1)} title="O'ng burilish ko'rsatkichi (E)">E ▶</button>
      </div>
      {ex.done && (
        <div className="exam-res-bg">
          <div className="exam-res glass">
            <div className={`er-t ${ex.passed ? 'ok' : 'no'}`}><span>{ex.passed ? '✓' : '✕'}</span><b>{ex.passed ? "Imtihondan o'tdingiz" : "Imtihondan o'tolmadingiz"}</b></div>
            <div className="er-n"><div><b className={ex.passed ? 'ok' : 'no'}>{pen}</b><small>/100 jarima balli</small></div><div><b>{fmt(ex.t)}</b><small>vaqt</small></div></div>
            {ex.reason && <p className="er-r">{ex.reason}</p>}
            {errs === 0 ? <p className="er-ok">Bitta ham xato yo'q</p> : <ul className="er-l">{Object.entries(ex.mistakes).map(([k, v]) => <li key={k}><span>{k}</span><b>×{v}</b></li>)}</ul>}
            <div className="er-b"><button className="glass" onClick={onExit}>Chiqish</button><button className="go" onClick={restart}>Qayta boshlash</button></div>
          </div>
        </div>
      )}
    </>
  )
}
