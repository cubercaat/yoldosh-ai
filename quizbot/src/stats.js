// Reytinglar: kunlik / haftalik / oylik / umumiy, eng yaxshi va eng faol o'yinchilar.
import { all, get } from './db.js';
import { periodRange, PERIOD_NAME, rankIcon, esc, displayName } from './util.js';
import { kb, cb, siteBtn, addGroupBtn, footer } from './core.js';

export const METRIC_NAME = {
  score: "Eng ko'p to'g'ri javob", active: 'Eng faol (ko\'p javob bergan)',
  accuracy: "Eng aniq (to'g'ri javob %)", random: 'Random (shartga mos qatnashchilardan)',
  referrals: "Eng ko'p do'st taklif qilgan",
};

function scopeWhere(scope) {
  if (scope.type === 'chat') { const ids = scope.ids?.length ? scope.ids : [0]; return [`a.chat_id IN (${ids.map(() => '?').join(',')})`, ids]; }
  if (scope.type === 'groups') return ['a.chat_id < 0', []];
  if (scope.type === 'private') return ['a.chat_id > 0', []];
  return ['1=1', []];
}

export function board({ scope = { type: 'all' }, from = 0, to = Date.now() + 1, metric = 'score', limit = 10, minAnswers = 0 }) {
  if (metric === 'referrals') {
    return all(`SELECT r.ref_by id, u.username, u.first_name, u.last_name, COUNT(*) score, COUNT(*) answers, 0 ms, 1.0 acc
      FROM users r LEFT JOIN users u ON u.id=r.ref_by
      WHERE r.ref_by IS NOT NULL AND r.created_at>=? AND r.created_at<? GROUP BY r.ref_by
      HAVING COUNT(*)>=? ORDER BY score DESC LIMIT ?`, from, to, Math.max(1, minAnswers), limit);
  }
  const [w, p] = scopeWhere(scope);
  const order = metric === 'active' || metric === 'random' ? 'answers DESC, score DESC'
    : metric === 'accuracy' ? 'acc DESC, answers DESC, ms ASC' : 'score DESC, ms ASC';
  return all(`SELECT a.user_id id, u.username, u.first_name, u.last_name, SUM(a.correct) score, COUNT(*) answers,
      SUM(a.ms) ms, CAST(SUM(a.correct) AS REAL)/COUNT(*) acc
    FROM answers a LEFT JOIN users u ON u.id=a.user_id
    WHERE a.at>=? AND a.at<? AND ${w} GROUP BY a.user_id HAVING COUNT(*)>=?
    ORDER BY ${order} LIMIT ?`, from, to, ...p, Math.max(0, minAnswers), limit);
}

export function boardLines(rows, metric = 'score') {
  if (!rows.length) return '<i>Hali natija yo\'q. Birinchi bo\'ling! 💪</i>';
  return rows.map((r, i) => {
    const n = esc(displayName(r));
    if (metric === 'active') return `${rankIcon(i)} ${n} — <b>${r.answers}</b> ta javob (${r.score} ✅)`;
    if (metric === 'accuracy') return `${rankIcon(i)} ${n} — <b>${Math.round(r.acc * 100)}%</b> (${r.score}/${r.answers})`;
    if (metric === 'referrals') return `${rankIcon(i)} ${n} — <b>${r.score}</b> ta do'st`;
    return `${rankIcon(i)} ${n} — <b>${r.score}</b> ✅ (${r.answers} ta javob)`;
  }).join('\n');
}

// /top xabari: davr va mezon tugmalari bilan
export function topView(scopeKey, chatId, period = 'w', metric = 'score', isPrivate = false) {
  const scope = scopeKey === 'c' ? { type: 'chat', ids: [chatId] } : { type: 'all' };
  const [from, to] = periodRange(period);
  const rows = board({ scope, from, to, metric, limit: 15 });
  const title = scopeKey === 'c' ? '🏆 Guruh reytingi' : '🌍 Umumiy reyting (barcha guruhlar va bot)';
  const mName = metric === 'active' ? '🔥 Eng faollar' : metric === 'referrals' ? '👥 Taklif qilganlar' : '🎯 Eng yaxshi o\'yinchilar';
  const text = `${title}\n📅 <b>${PERIOD_NAME[period]}</b> · ${mName}\n\n${boardLines(rows, metric)}${footer()}`;
  const p = (k) => cb((k === period ? '• ' : '') + PERIOD_NAME[k], `top:${scopeKey}:${k}:${metric}`);
  const m = (k, t) => cb((k === metric ? '• ' : '') + t, `top:${scopeKey}:${period}:${k}`);
  const rows2 = [
    [p('d'), p('w'), p('m'), p('a')],
    [m('score', '🎯 Eng yaxshilar'), m('active', '🔥 Eng faollar')],
  ];
  if (scopeKey === 'g') rows2[1].push(m('referrals', '👥 Taklif'));
  rows2.push([siteBtn('🌐 chorrahaa.uz — to\'liq tayyorgarlik', 'top', isPrivate)]);
  if (!isPrivate) rows2.push([addGroupBtn()]);
  return { text, reply_markup: kb(rows2) };
}

export function userSummary(uid) {
  const out = {};
  for (const p of ['d', 'w', 'a']) {
    const [from, to] = periodRange(p);
    out[p] = get('SELECT COALESCE(SUM(correct),0) score, COUNT(*) answers FROM answers WHERE user_id=? AND at>=? AND at<?', uid, from, to);
  }
  const [wf, wt] = periodRange('w');
  const better = get(`SELECT COUNT(*) c FROM (SELECT user_id, SUM(correct) s FROM answers WHERE at>=? AND at<? GROUP BY user_id)
    WHERE s > ?`, wf, wt, out.w.score).c;
  out.weekRank = out.w.answers ? better + 1 : null;
  out.games = get('SELECT COUNT(DISTINCT game_id) c FROM answers WHERE user_id=?', uid).c;
  out.refs = get('SELECT COUNT(*) c FROM users WHERE ref_by=?', uid).c;
  return out;
}
