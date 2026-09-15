import { Compiler } from 'mindar-image';

const preview = document.getElementById('compilePreview');
const noPreview = document.getElementById('noPreview');
const uploadForm = document.getElementById('uploadTargetForm');
const uploadStatus = document.getElementById('uploadTargetStatus');
const btnCompile = document.getElementById('btnCompile');
const btnRetry = document.getElementById('btnRetry');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const compileStatus = document.getElementById('compileStatus');
const mindBadge = document.getElementById('mindBadge');

let compiling = false;

function showStatus(el, ok, msg, warn = false) {
  el.classList.remove('hidden', 'ok', 'err', 'warn');
  el.classList.add(ok ? (warn ? 'warn' : 'ok') : 'err');
  el.textContent = msg;
}

function setProgress(p) {
  const v = Math.max(0, Math.min(100, p));
  progressBar.style.width = v.toFixed(1) + '%';
  progressText.textContent = v.toFixed(1) + '%';
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('targetFile').files[0];
  if (!file) {
    showStatus(uploadStatus, false, 'Choose an image first.');
    return;
  }
  const fd = new FormData();
  fd.append('target', file);
  showStatus(uploadStatus, true, 'Uploading...');
  try {
    const res = await fetch('upload-target.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Upload failed');
    showStatus(uploadStatus, true, data.message || 'Uploaded.');
    if (preview && data.url) {
      preview.src = data.url;
      preview.classList.remove('hidden');
    }
    if (noPreview) noPreview.classList.add('hidden');
    btnCompile.disabled = false;
    if (mindBadge) {
      mindBadge.className = 'status warn';
      mindBadge.textContent = 'targets.mind removed — compile required.';
    }
  } catch (err) {
    showStatus(uploadStatus, false, err.message || 'Upload failed');
  }
});

async function compile() {
  if (compiling) return;
  if (!preview || !preview.src) {
    showStatus(compileStatus, false, 'No target image to compile.');
    return;
  }
  compiling = true;
  btnCompile.disabled = true;
  btnRetry.disabled = true;
  setProgress(0);
  showStatus(compileStatus, true, 'Compiling target features...', true);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load target image.'));
      img.src = preview.src.split('?')[0] + '?v=' + Date.now();
    });

    const compiler = new Compiler();
    await compiler.compileImageTargets([img], (progress) => {
      setProgress(progress);
    });
    const buffer = await compiler.exportData();
    setProgress(100);
    showStatus(compileStatus, true, 'Saving compiled target...', true);

    const res = await fetch('save-target.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buffer
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to save targets.mind');

    showStatus(compileStatus, true, 'Compilation successful (' + data.bytes + ' bytes).');
    if (mindBadge) {
      mindBadge.className = 'status ok';
      mindBadge.textContent = 'targets.mind is present.';
    }
  } catch (err) {
    console.error(err);
    showStatus(compileStatus, false, err.message || 'Compilation failed.');
    btnRetry.disabled = false;
  } finally {
    compiling = false;
    btnCompile.disabled = false;
  }
}

btnCompile.addEventListener('click', compile);
btnRetry.addEventListener('click', compile);