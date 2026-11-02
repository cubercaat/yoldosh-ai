/* DO'STLAR: kuzatish (follow). Bir-birini kuzatganlar — do'st: ular Duelda 1v1 bellasha oladi. Server: server/friends.js */
(function () {
  const { ico, esc, toast } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());
  async function call(method, path, body) {
    const r = await fetch(api() + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) { }
    if (!r.ok) throw new Error(j.error || 'xato'); return j;
  }
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const av = (p) => `<span class="fr-av" style="--h:${hue(p.name)}">${esc((p.name || '?')[0])}</span>`;
  const bd = (p) => `${p.tier && V.T && V.T.chip ? V.T.chip(p.tier, 14) : ''}${p.tick ? '<i class="duel-tick" title="Botni yutgan">✓</i>' : ''}${p.medal ? '<i class="duel-star" title="Medal">⭐</i>' : ''}`;
  const sub = (p) => `<small>${window.DuelArt ? DuelArt.league(p.li, 15) : ''} ${esc(p.league || '')} · ${p.pts || 0} ball${p.region ? ' · ' + esc(p.region) : ''}</small>`;
  const row = (p, btns) => `<div class="fr-r">${av(p)}<div class="fr-i"><b>${esc(p.name)} ${bd(p)}</b>${sub(p)}</div><div class="fr-b">${btns}</div></div>`;
  const fbtn = (p) => p.following
    ? `<button class="btn sm soft" data-act="fr-unfollow" data-id="${p.id}">${p.followsMe ? "Do'st ✓" : 'Kuzatilmoqda'}</button>`
    : `<button class="btn sm primary" data-act="fr-follow" data-id="${p.id}">${p.followsMe ? 'Javob qaytarish' : '+ Kuzatish'}</button>`;
  let D = null;
  function paint() {
    const el = document.getElementById('fr-body'), iv = document.getElementById('fr-inv'); if (!el || !D) return;
    iv.innerHTML = D.invites.length ? `<div class="fr-sec"><h3>${ico('bolt')} Duelga chaqiruvlar</h3>${D.invites.map((x) => `<div class="fr-r fr-inv">${av(x.from)}<div class="fr-i"><b>${esc(x.from.name)} ${bd(x.from)}</b><small>Sizni 1v1 Duelga chorlayapti</small></div><div class="fr-b"><button class="btn sm primary" data-act="fr-accept" data-id="${x.game}">Qabul</button><button class="btn sm ghost" data-act="fr-decline" data-id="${x.game}" aria-label="Rad etish">✕</button></div></div>`).join('')}</div>` : '';
    const sec = (t, list, btn, empty) => `<div class="fr-sec"><h3>${t} <em>${list.length}</em></h3>${list.length ? list.map((p) => row(p, btn(p))).join('') : `<p class="mute fr-e">${empty}</p>`}</div>`;
    el.innerHTML =
      sec(`${ico('users')} Do'stlarim`, D.friends, (p) => `<button class="btn sm primary" data-act="fr-invite" data-id="${p.id}">${ico('swords')} Duel</button><button class="btn sm ghost" data-act="fr-unfollow" data-id="${p.id}" aria-label="Kuzatuvni bekor qilish">✕</button>`, "Hali do'st yo'q. Qidiruv orqali odam toping va kuzating — u ham sizni kuzatsa, do'st bo'lasiz.") +
      (D.followers.length ? sec(`${ico('star')} Sizni kuzatadiganlar`, D.followers, (p) => `<button class="btn sm primary" data-act="fr-follow" data-id="${p.id}">Javob qaytarish</button>`, '') : '') +
      (D.following.length ? sec(`${ico('arrow')} Siz kuzatayotganlar`, D.following, (p) => `<button class="btn sm soft" data-act="fr-unfollow" data-id="${p.id}">Kuzatilmoqda</button>`, '') : '');
  }
  async function load() { try { D = await call('GET', '/friends'); paint(); } catch (e) { const el = document.getElementById('fr-body'); if (el) el.innerHTML = `<p class="mute fr-e">Yuklab bo'lmadi. Internetni tekshiring.</p>`; } }
  let tm = 0, poll = 0;
  V.friends = () => ({
    html: V.shellStudent('friends', `<div class="page-h"><div><h1>Do'stlar</h1><p>Bir-biringizni kuzating: o'zaro kuzatgan do'stlar Duelda 1v1 bellasha oladi.</p></div></div>
      <div class="fr-hero"><span class="fr-hi">${window.DuelArt ? DuelArt.crest(54) : ''}</span><div><b>Do'st bilan Duel</b><small>Do'stingizni toping, kuzating — u ham sizni kuzatsa, bir tugma bilan duelga chaqirasiz.</small></div></div>
      <label class="fr-s">${ico('search')}<input id="fr-q" type="search" placeholder="Ism, @username yoki ID bo'yicha qidirish" autocomplete="off" enterkeyhint="search"></label>
      <div id="fr-res"></div><div id="fr-inv"></div><div id="fr-body"><p class="mute fr-e">Yuklanmoqda…</p></div>`),
    mount() {
      if (!live()) { document.getElementById('fr-body').innerHTML = `<p class="mute fr-e">Do'stlar faqat onlayn rejimda ishlaydi. Telegram orqali kiring.</p>`; return; }
      load(); poll = setInterval(load, 8000);
      const q = document.getElementById('fr-q');
      q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(async () => {
        const v = q.value.trim(), el = document.getElementById('fr-res'); if (!el) return;
        if (v.length < 2) { el.innerHTML = ''; return; }
        try { const r = await call('GET', '/friends/search?q=' + encodeURIComponent(v)); el.innerHTML = `<div class="fr-sec"><h3>Qidiruv natijasi</h3>${r.list.length ? r.list.map((p) => row(p, fbtn(p))).join('') : '<p class="mute fr-e">Hech kim topilmadi</p>'}</div>`; } catch (e) { el.innerHTML = ''; }
      }, 350); });
    },
    unmount() { clearInterval(poll); },
  });
  const after = async () => { await load(); const q = document.getElementById('fr-q'); if (q && q.value.trim().length >= 2) q.dispatchEvent(new Event('input')); };
  V.acts = Object.assign(V.acts || {}, {
    async 'fr-follow'(el) { el.disabled = true; try { const r = await call('POST', '/friends/follow', { id: Number(el.dataset.id) }); toast(r.friend ? "Endi siz do'stsiz! ⚔️" : 'Kuzatilmoqda'); await after(); } catch (e) { toast(e.message); el.disabled = false; } },
    async 'fr-unfollow'(el) { el.disabled = true; try { await call('POST', '/friends/unfollow', { id: Number(el.dataset.id) }); await after(); } catch (e) { toast(e.message); el.disabled = false; } },
    async 'fr-invite'(el) { el.disabled = true; try { const r = await call('POST', '/duel/invite', { to: Number(el.dataset.id) }); location.hash = '#/app/duel/' + r.id; } catch (e) { toast(e.message); el.disabled = false; } },
    async 'fr-accept'(el) { el.disabled = true; try { const r = await call('POST', '/duel/' + el.dataset.id + '/accept', {}); location.hash = '#/app/duel/' + r.id; } catch (e) { toast(e.message); await load(); } },
    async 'fr-decline'(el) { try { await call('POST', '/duel/' + el.dataset.id + '/decline', {}); } catch (e) { } await load(); },
  });
})();
