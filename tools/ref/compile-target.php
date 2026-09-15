<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compile Target — ARGAME</title>
  <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="page-home">
  <div class="site-wrap">
    <nav class="site-nav">
      <a class="site-brand" href="index.php">ARGAME</a>
      <div class="site-nav-links">
        <a class="nav-link" href="index.php">Home</a>
        <a class="nav-link" href="game.php">Play</a>
      </div>
    </nav>

    <section class="section" style="max-width:640px;margin:0 auto">
      <h2>Compile MindAR Target</h2>
      <p class="muted">Builds <code>targets.mind</code> from <code>assets/targets/picture.jpg</code>. Keep this page open until it finishes.</p>
      <figure class="target-preview" style="margin:1rem 0">
        <img src="assets/targets/picture.jpg?v=1789288768" alt="Target preview">
      </figure>
      <div id="status" class="muted">Ready…</div>
      <div class="progress-track" style="margin:1rem 0;height:8px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden">
        <div id="bar" style="height:100%;width:0%;background:linear-gradient(90deg,#d4b14a,#5dcf7a);transition:width .2s"></div>
      </div>
      <div class="row-actions">
        <button type="button" id="btn-run" class="btn btn-primary">Start Compile</button>
        <a class="btn btn-ghost" href="index.php">Home</a>
        <a class="btn btn-ghost" href="game.php">Play</a>
      </div>
    </section>
  </div>

  <script type="module">
    import { Compiler } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';

    const status = document.getElementById('status');
    const bar = document.getElementById('bar');
    const btn = document.getElementById('btn-run');
    const autostart = false;

    const log = (msg, cls = '') => {
      status.textContent = msg;
      status.className = cls === 'ok' ? 'flash-ok' : (cls === 'err' ? 'flash-err' : 'muted');
      document.title = cls === 'ok' ? 'COMPILE_OK' : (cls === 'err' ? 'COMPILE_ERR' : 'COMPILING');
    };

    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load picture.jpg'));
      img.src = src + '?t=' + Date.now();
    });

    async function run() {
      btn.disabled = true;
      btn.textContent = 'Compiling…';
      try {
        log('Loading target image…');
        const img = await loadImage('assets/targets/picture.jpg');
        log(`Image ${img.width}×${img.height}. Compiling…`);
        const compiler = new Compiler();
        await compiler.compileImageTargets([img], (progress) => {
          const p = Math.max(0, Math.min(100, progress));
          bar.style.width = p.toFixed(1) + '%';
          log(`Compiling… ${p.toFixed(1)}%`);
        });
        const buffer = await compiler.exportData();
        log(`Compiled ${buffer.byteLength} bytes. Saving…`);
        const res = await fetch('save-target.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: buffer,
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Save failed');
        bar.style.width = '100%';
        log(`Done. Saved ${json.path} (${json.bytes} bytes). You can start the game.`, 'ok');
        btn.textContent = 'Recompile';
        btn.disabled = false;
        window.__COMPILE_RESULT__ = { ok: true, bytes: json.bytes };
      } catch (err) {
        console.error(err);
        log(String(err?.message || err), 'err');
        btn.textContent = 'Retry';
        btn.disabled = false;
        window.__COMPILE_RESULT__ = { ok: false, error: String(err?.message || err) };
      }
    }

    btn.addEventListener('click', run);
    if (autostart) run();
  </script>
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495" integrity="sha512-iIg7k2xntmwu6/uSb5tpc/hySgZc4eoL31yB29W6tJFo2akwjPWcEqnCEdJvGexCL0KEQwVYv5BlowfhVz26hg==" data-cf-beacon='{"version":"2024.11.0","token":"8b2523dc771340f3af2d38766e62a38b","r":1,"spa":2}' crossorigin="anonymous"></script>
</body>
</html>
