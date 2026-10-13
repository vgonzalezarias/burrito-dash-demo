/* Burrito Dash — mobile nav, footer year, progressive reveal. Vanilla only. */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var year = document.getElementById('year');
  if (year) { year.textContent = new Date().getFullYear(); }

  /* Scroll reveal is progressive enhancement only. Content is visible by default;
     .reveal elements are hidden ONLY after we've confirmed IntersectionObserver
     works and motion is allowed (the .js-anim class gates the hiding CSS). */
  var reveals = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reveals.length || reduce || !('IntersectionObserver' in window)) { return; }

  var root = document.documentElement;
  var io;
  try {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
  } catch (err) { return; }

  // Anything already on screen is marked visible before hiding kicks in — no flash, no gap.
  var vh = window.innerHeight || document.documentElement.clientHeight;
  Array.prototype.forEach.call(reveals, function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) { el.classList.add('visible'); } else { io.observe(el); }
  });
  root.classList.add('js-anim');

  function showAll() { Array.prototype.forEach.call(reveals, function (el) { el.classList.add('visible'); }); }
  window.addEventListener('beforeprint', showAll);
  // Jumping to an anchor (e.g. menu.html#small) should never land on hidden content.
  window.addEventListener('hashchange', showAll);
  if (location.hash) { showAll(); }
})();
