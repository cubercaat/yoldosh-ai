// Telegram Bot API uchun kichik klient (fetch asosida, tashqi kutubxonasiz).
import fs from 'node:fs';
import path from 'node:path';
import { sleep } from './util.js';

export class InputFile {
  constructor(filePath, name) { this.path = filePath; this.name = name || path.basename(filePath); }
}

export function createApi(token, root) {
  const base = `${root}/bot${token}/`;

  async function call(method, params = {}, attempt = 0) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null));
    const hasFile = Object.values(clean).some((v) => v instanceof InputFile);
    let body, headers = {};
    if (hasFile) {
      body = new FormData();
      for (const [k, v] of Object.entries(clean)) {
        if (v instanceof InputFile) body.append(k, new Blob([fs.readFileSync(v.path)]), v.name);
        else body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    } else {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(clean);
    }
    let data;
    try {
      const res = await fetch(base + method, {
        method: 'POST', body, headers,
        signal: AbortSignal.timeout(method === 'getUpdates' ? 70000 : 40000),
      });
      data = await res.json();
    } catch (e) {
      if (attempt < 3) { await sleep(1500 * (attempt + 1)); return call(method, params, attempt + 1); }
      throw e;
    }
    if (data.ok) return data.result;
    const retry = data.parameters?.retry_after;
    if (data.error_code === 429 && attempt < 6) { await sleep(((retry || 3) + 0.5) * 1000); return call(method, params, attempt + 1); }
    if (data.error_code >= 500 && attempt < 3) { await sleep(2000); return call(method, params, attempt + 1); }
    const err = new Error(`${method}: ${data.description}`);
    err.code = data.error_code;
    err.description = String(data.description || '');
    err.migrateTo = data.parameters?.migrate_to_chat_id;
    throw err;
  }

  return new Proxy({ call }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'then' || typeof key === 'symbol') return undefined;
      return (params) => call(key, params);
    },
  });
}

// Xatoning turi: chat endi mavjud emas / bot chiqarib yuborilgan / foydalanuvchi bloklagan
export function isGoneError(e) {
  const d = (e?.description || '').toLowerCase();
  return e?.code === 403 || d.includes('chat not found') || d.includes('bot was kicked') ||
    d.includes('user is deactivated') || d.includes('bot is not a member') || d.includes('group chat was deleted') ||
    d.includes('have no rights to send a message') || d.includes('chat_write_forbidden');
}
export const isRightsError = (e) => /not enough rights|need administrator rights|chat_send_\w+_forbidden|rights to send/i.test(e?.description || '');
