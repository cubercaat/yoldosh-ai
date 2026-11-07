/* Pastki panel «Liquid Glass»: tanlangan bo'lim ostidagi shisha linza yangi bo'limga cho'zilib oqib o'tadi.
   Sahifa har safar qayta chiziladi (panel ham yangidan yaratiladi), shuning uchun linzaning oxirgi o'rni eslab qolinadi
   va yangi paneldagi linza o'sha joydan hozirgi bo'limga animatsiya bilan ketadi. */
(function () {
  'use strict';
  var last = null;                                  // {x, w}: linzaning panel ichidagi oxirgi o'rni (px)
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function geo(nav, el) {
    var n = nav.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: Math.round((r.left - n.left) * 10) / 10, w: Math.round((r.width - 2) * 10) / 10 };   // -1 (chegara) +1 (chetdan bo'sh joy)
  }
  function put(lens, g) { lens.style.width = g.w + 'px'; lens.style.transform = 'translateX(' + g.x + 'px)'; }

  /* Suyuqlik effekti: yo'nalish tomondagi chekka tez, orqadagisi sekin — linza cho'ziladi, keyin joyiga o'rnashadi */
  function flow(lens, a, b) {
    var L0 = a.x, R0 = a.x + a.w, L1 = b.x, R1 = b.x + b.w, right = L1 >= L0, o = right ? 7 : -7, fr = [];
    function kf(L, R, sy, off, ease) { fr.push({ transform: 'translateX(' + L + 'px) scaleY(' + sy + ')', width: Math.max(8, R - L) + 'px', offset: off, easing: ease || 'ease-out' }); }
    if (right) {
      kf(L0, R0, 1, 0);
      kf(L0 + (L1 - L0) * .22, R1 + o, .9, .38);
      kf(L0 + (L1 - L0) * .82, R1 + o * .3, .97, .72);
      kf(L1, R1, 1, 1, 'cubic-bezier(.3,1.5,.5,1)');
    } else {
      kf(L0, R0, 1, 0);
      kf(L1 + o, R0 + (R1 - R0) * .22, .9, .38);
      kf(L1 + o * .3, R0 + (R1 - R0) * .82, .97, .72);
      kf(L1, R1, 1, 1, 'cubic-bezier(.3,1.5,.5,1)');
    }
    try { lens.animate(fr, { duration: 560, fill: 'none' }); } catch (e) { }
    put(lens, b);
  }

  function sync(nav) {
    nav.setAttribute('data-lg', '1');
    var lens = nav.querySelector('.lg-lens');
    if (!lens) { lens = document.createElement('i'); lens.className = 'lg-lens'; lens.setAttribute('aria-hidden', 'true'); nav.insertBefore(lens, nav.firstChild); }
    var on = nav.querySelector('a.on');
    if (!on || !nav.offsetWidth) { lens.classList.add('off'); if (last) put(lens, last); return; }
    var g = geo(nav, on);
    lens.classList.remove('off');
    if (last && !reduce && (Math.abs(last.x - g.x) > 1 || Math.abs(last.w - g.w) > 1)) { put(lens, last); void lens.offsetWidth; flow(lens, last, g); }
    else put(lens, g);
    last = g;
  }

  function scan() { var nav = document.querySelector('.tabbar:not([data-lg])'); if (nav) sync(nav); }
  function start() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', function () {
      var nav = document.querySelector('.tabbar[data-lg]'), on = nav && nav.querySelector('a.on'), lens = nav && nav.querySelector('.lg-lens');
      if (on && lens && nav.offsetWidth) { last = geo(nav, on); put(lens, last); }
    });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
