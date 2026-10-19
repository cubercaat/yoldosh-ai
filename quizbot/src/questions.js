import fs from 'node:fs';
import path from 'node:path';
import { CFG } from './config.js';
import { all, run } from './db.js';
import { shuffle } from './util.js';

const data = JSON.parse(fs.readFileSync(path.join(CFG.dataDir, 'questions.json'), 'utf8'));
export const QUESTIONS = data.questions;
export const TOPICS = data.topics;
export const byN = new Map(QUESTIONS.map((q) => [q.n, q]));
export const topicName = (id) => (!id || id === 'mix' ? 'Aralash' : TOPICS.find((t) => t.id === id)?.name || 'Aralash');
export const topicCount = (id) => QUESTIONS.filter((q) => q.topic === id).length;
export const imagePath = (q) => (q.image ? path.join(CFG.dataDir, q.image) : null);

// Telegram so'rovnomasi cheklovlari: savol <= 300, variant <= 100 belgi
export const pollFits = (q, prefix) => (prefix + q.question).length <= 300 && q.options.every((o) => o.length <= 100);

// Guruhda takrorlanmasin: avval berilmagan savollardan tanlanadi, tugasa qaytadan boshlanadi
export function pickQuestions(chatId, count, topic) {
  // Faqat avtomatik sinov uchun: FORCE_QNS=13,8,1 — aniq savollar
  if (process.env.FORCE_QNS) return process.env.FORCE_QNS.split(',').map(Number).map((n) => byN.get(n)).filter(Boolean).slice(0, count);
  const pool = QUESTIONS.filter((q) => !topic || topic === 'mix' || q.topic === topic);
  const used = new Set(all('SELECT qn FROM used_q WHERE chat_id=?', chatId).map((r) => r.qn));
  let fresh = pool.filter((q) => !used.has(q.n));
  if (fresh.length < count) {
    for (const q of pool) run('DELETE FROM used_q WHERE chat_id=? AND qn=?', chatId, q.n);
    fresh = pool.slice();
  }
  const list = shuffle(fresh).slice(0, Math.min(count, fresh.length));
  for (const q of list) run('INSERT OR IGNORE INTO used_q(chat_id,qn) VALUES(?,?)', chatId, q.n);
  return list;
}
