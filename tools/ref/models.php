<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Models — ARGAME</title>
  <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="page-home">
  <div class="site-wrap">
    <nav class="site-nav">
      <a class="site-brand" href="index.php">ARGAME</a>
      <div class="site-nav-links">
        <a class="nav-link" href="index.php">Home</a>
        <a class="nav-link" href="game.php">Play</a>
        <a class="nav-link" href="models.php">Models</a>
      </div>
    </nav>

    <header class="hero" style="margin-bottom:1.25rem">
      <div class="hero-copy">
        <p class="kicker">Loadout</p>
        <h1>Change Gun<br><span>&amp; Enemy</span></h1>
        <p class="hero-lead">Pick from the library or upload new GLBs. Re-open the game after saving to apply.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="game.php">Start Game</a>
          <a class="btn btn-ghost" href="index.php">Home</a>
        </div>
      </div>
    </header>

        
    <section class="section">
      <h2>Current Selection</h2>
      <p class="muted">Enemy: <code>random</code> (random each game start)<br>
        Weapon: <code>random</code> (random each game start)</p>

      <form method="post" class="models-grid">
        <input type="hidden" name="action" value="save">
        <div class="models-card">
          <h3>Enemy</h3>
          <div class="field">
            <label for="enemy">Select GLB</label>
            <select id="enemy" name="enemy" required>
              <option value="random" selected>
                Random (any monster)
              </option>
                                              <option value="alien-rrlisqbp7r.glb" >
                  alien-rrlisqbp7r.glb                </option>
                                              <option value="alien.glb" >
                  alien.glb                </option>
                                              <option value="alpaking-evolved.glb" >
                  alpaking-evolved.glb                </option>
                                              <option value="alpaking.glb" >
                  alpaking.glb                </option>
                                              <option value="armabee-evolved.glb" >
                  armabee-evolved.glb                </option>
                                              <option value="armabee.glb" >
                  armabee.glb                </option>
                                              <option value="birb.glb" >
                  birb.glb                </option>
                                              <option value="blue-demon.glb" >
                  blue-demon.glb                </option>
                                              <option value="bunny.glb" >
                  bunny.glb                </option>
                                              <option value="cactoro-ign9lhdama.glb" >
                  cactoro-ign9lhdama.glb                </option>
                                              <option value="cactoro.glb" >
                  cactoro.glb                </option>
                                              <option value="cat.glb" >
                  cat.glb                </option>
                                              <option value="chicken.glb" >
                  chicken.glb                </option>
                                              <option value="demon-lnfizikv4o.glb" >
                  demon-lnfizikv4o.glb                </option>
                                              <option value="demon.glb" >
                  demon.glb                </option>
                                              <option value="dino.glb" >
                  dino.glb                </option>
                                              <option value="dragon-evolved.glb" >
                  dragon-evolved.glb                </option>
                                              <option value="dragon.glb" >
                  dragon.glb                </option>
                                              <option value="fish-ypeyhcimab.glb" >
                  fish-ypeyhcimab.glb                </option>
                                              <option value="fish.glb" >
                  fish.glb                </option>
                                                                              <option value="frog.glb" >
                  frog.glb                </option>
                                              <option value="ghost-skull.glb" >
                  ghost-skull.glb                </option>
                                              <option value="ghost.glb" >
                  ghost.glb                </option>
                                              <option value="glub-evolved.glb" >
                  glub-evolved.glb                </option>
                                              <option value="glub.glb" >
                  glub.glb                </option>
                                              <option value="goleling-evolved.glb" >
                  goleling-evolved.glb                </option>
                                              <option value="goleling.glb" >
                  goleling.glb                </option>
                                              <option value="green-blob.glb" >
                  green-blob.glb                </option>
                                              <option value="green-spiky-blob.glb" >
                  green-spiky-blob.glb                </option>
                                              <option value="hywirl.glb" >
                  hywirl.glb                </option>
                                              <option value="monkroose.glb" >
                  monkroose.glb                </option>
                                              <option value="mushnub-evolved.glb" >
                  mushnub-evolved.glb                </option>
                                              <option value="mushnub.glb" >
                  mushnub.glb                </option>
                                              <option value="mushroom-king.glb" >
                  mushroom-king.glb                </option>
                                              <option value="ninja-xgymedpftu.glb" >
                  ninja-xgymedpftu.glb                </option>
                                              <option value="ninja.glb" >
                  ninja.glb                </option>
                                              <option value="orc-enemy.glb" >
                  orc-enemy.glb                </option>
                                              <option value="orc.glb" >
                  orc.glb                </option>
                                              <option value="pigeon.glb" >
                  pigeon.glb                </option>
                                              <option value="pink-blob.glb" >
                  pink-blob.glb                </option>
                                              <option value="squidle.glb" >
                  squidle.glb                </option>
                                              <option value="tribal.glb" >
                  tribal.glb                </option>
                                              <option value="wizard.glb" >
                  wizard.glb                </option>
                                              <option value="yeti-cerhrn8hhe.glb" >
                  yeti-cerhrn8hhe.glb                </option>
                                              <option value="yeti.glb" >
                  yeti.glb                </option>
                          </select>
          </div>
        </div>
        <div class="models-card">
          <h3>Weapon</h3>
          <div class="field">
            <label for="weapon">Select GLB</label>
            <select id="weapon" name="weapon" required>
              <option value="random" selected>
                Random (AKM or Rig)
              </option>
                              <option value="fps-akm.glb" >
                  Fps Rig AKM.glb                </option>
                              <option value="fps-rig.glb" >
                  Fps Rig.glb                </option>
                          </select>
          </div>
        </div>
        <div class="row-actions" style="grid-column:1/-1">
          <button type="submit" class="btn btn-primary">Save Selection</button>
        </div>
      </form>
    </section>

    <section class="section">
      <h2>Upload New GLB</h2>
      <div class="models-grid">
        <form method="post" enctype="multipart/form-data" class="models-card">
          <h3>Upload Enemy</h3>
          <input type="hidden" name="action" value="upload">
          <input type="hidden" name="slot" value="enemy">
          <div class="field">
            <label for="enemy-file">.glb file</label>
            <input id="enemy-file" type="file" name="file" accept=".glb,model/gltf-binary" required>
          </div>
          <label class="check"><input type="checkbox" name="apply" value="1" checked> Apply as enemy after upload</label>
          <div class="row-actions">
            <button type="submit" class="btn btn-primary">Upload Enemy</button>
          </div>
        </form>

        <form method="post" enctype="multipart/form-data" class="models-card">
          <h3>Upload Weapon</h3>
          <input type="hidden" name="action" value="upload">
          <input type="hidden" name="slot" value="weapon">
          <div class="field">
            <label for="weapon-file">.glb file</label>
            <input id="weapon-file" type="file" name="file" accept=".glb,model/gltf-binary" required>
          </div>
          <label class="check"><input type="checkbox" name="apply" value="1" checked> Apply as weapon after upload</label>
          <div class="row-actions">
            <button type="submit" class="btn btn-primary">Upload Weapon</button>
          </div>
        </form>
      </div>
      <p class="muted" style="margin-top:1rem">47 GLB files in library. You can also drop files into
        <code>Ultimate Monsters Bundle-glb</code> / <code>FPS pack.undefined-glb</code> — this page syncs them automatically.</p>
    </section>
  </div>
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495" integrity="sha512-iIg7k2xntmwu6/uSb5tpc/hySgZc4eoL31yB29W6tJFo2akwjPWcEqnCEdJvGexCL0KEQwVYv5BlowfhVz26hg==" data-cf-beacon='{"version":"2024.11.0","token":"8b2523dc771340f3af2d38766e62a38b","r":1,"spa":2}' crossorigin="anonymous"></script>
</body>
</html>
