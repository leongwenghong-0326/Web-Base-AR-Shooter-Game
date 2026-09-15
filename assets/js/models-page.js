(function () {
  const saveStatus = document.getElementById('saveStatus');
  const uploadStatus = document.getElementById('uploadStatus');
  const fileList = document.getElementById('fileList');

  function showStatus(el, ok, msg) {
    el.classList.remove('hidden', 'ok', 'err');
    el.classList.add(ok ? 'ok' : 'err');
    el.textContent = msg;
  }

  function refreshList(files) {
    if (!fileList) return;
    fileList.innerHTML = '';
    if (!files || !files.length) {
      const li = document.createElement('li');
      li.textContent = 'No GLB files yet.';
      fileList.appendChild(li);
      return;
    }
    files.forEach(function (f) {
      const li = document.createElement('li');
      li.textContent = f;
      fileList.appendChild(li);
    });
  }

  function fillSelect(select, candidates, current) {
    if (!select) return;
    const value = current || select.value;
    select.innerHTML = '';
    const optR = document.createElement('option');
    optR.value = 'random';
    optR.textContent = 'Random';
    select.appendChild(optR);
    (candidates || []).forEach(function (f) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      select.appendChild(opt);
    });
    select.value = value;
    if (select.value !== value) select.value = 'random';
  }

  document.getElementById('modelForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const enemy = document.getElementById('enemySelect').value;
    const weapon = document.getElementById('weaponSelect').value;
    showStatus(saveStatus, true, 'Saving...');
    try {
      const res = await fetch('api/models.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', enemy: enemy, weapon: weapon })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Save failed');
      showStatus(saveStatus, true, data.message || 'Selection saved.');
      fillSelect(document.getElementById('enemySelect'), data.enemyCandidates, data.config.enemy);
      fillSelect(document.getElementById('weaponSelect'), data.weaponCandidates, data.config.weapon);
      refreshList(data.files);
    } catch (err) {
      showStatus(saveStatus, false, err.message || 'Save failed');
    }
  });

  document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const fileInput = document.getElementById('modelFile');
    if (!fileInput.files || !fileInput.files[0]) {
      showStatus(uploadStatus, false, 'Choose a GLB file first.');
      return;
    }
    const fd = new FormData();
    fd.append('action', 'upload');
    fd.append('model', fileInput.files[0]);
    showStatus(uploadStatus, true, 'Uploading...');
    try {
      const res = await fetch('api/models.php', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Upload failed');
      showStatus(uploadStatus, true, data.message || 'Uploaded.');
      fillSelect(document.getElementById('enemySelect'), data.enemyCandidates, data.config.enemy);
      fillSelect(document.getElementById('weaponSelect'), data.weaponCandidates, data.config.weapon);
      refreshList(data.files);
      fileInput.value = '';
    } catch (err) {
      showStatus(uploadStatus, false, err.message || 'Upload failed');
    }
  });
})();