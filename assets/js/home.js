(function () {
  const urlEl = document.getElementById('publicUrl');
  const canvas = document.getElementById('qrCanvas');
  let qrImg = document.getElementById('qrImage');

  function currentUrl() {
    return (urlEl && urlEl.textContent || '').trim();
  }

  function ensureImg() {
    if (qrImg) return qrImg;
    if (!canvas || !canvas.parentNode) return null;
    qrImg = document.createElement('img');
    qrImg.id = 'qrImage';
    qrImg.alt = 'QR code';
    qrImg.width = 220;
    qrImg.height = 220;
    canvas.insertAdjacentElement('afterend', qrImg);
    canvas.classList.add('hidden');
    return qrImg;
  }

  function drawFallback(url) {
    if (!url) return;
    const img = ensureImg();
    if (!img) return;
    img.classList.remove('hidden');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=' + encodeURIComponent(url);
    if (canvas) canvas.classList.add('hidden');
  }

  function renderWithLibrary(url) {
    if (!window.QRCode || typeof QRCode.toCanvas !== 'function' || !canvas || !url) {
      return false;
    }
    QRCode.toCanvas(canvas, url, {
      width: 220,
      margin: 1,
      color: { dark: '#0b0f14', light: '#ffffff' }
    }, function (err) {
      if (err) {
        console.error(err);
        drawFallback(url);
        return;
      }
      canvas.classList.remove('hidden');
      if (qrImg) qrImg.classList.add('hidden');
    });
    return true;
  }

  window.renderArGameQr = function (nextUrl) {
    const value = (nextUrl || currentUrl()).trim();
    if (!value) return;
    if (urlEl && nextUrl) urlEl.textContent = value;
    if (!renderWithLibrary(value)) {
      drawFallback(value);
    }
  };

  // Retry briefly while CDN script loads, then fall back to QR image API
  (function waitForQr(attempt) {
    const value = currentUrl();
    if (renderWithLibrary(value)) return;
    if (attempt < 50) {
      setTimeout(function () { waitForQr(attempt + 1); }, 100);
      return;
    }
    drawFallback(value);
  })(0);

  const dl = document.getElementById('btnDownloadQr');
  if (dl) {
    dl.addEventListener('click', function () {
      const a = document.createElement('a');
      a.download = 'ar-game-qr.png';
      if (canvas && !canvas.classList.contains('hidden') && canvas.width) {
        a.href = canvas.toDataURL('image/png');
      } else if (qrImg && qrImg.src) {
        a.href = qrImg.src;
      } else {
        return;
      }
      a.click();
    });
  }

  const preview = document.getElementById('targetPreview');
  const fsBtn = document.getElementById('btnFullscreenTarget');

  function openFullscreen() {
    if (!preview) {
      window.open('compile-target.php', '_blank');
      return;
    }
    const el = preview;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () {
        window.open(el.src, '_blank');
      });
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      window.open(el.src, '_blank');
    }
  }

  if (preview) preview.addEventListener('click', openFullscreen);
  if (fsBtn) fsBtn.addEventListener('click', openFullscreen);

  const siteForm = document.getElementById('siteForm');
  const siteStatus = document.getElementById('siteStatus');
  if (siteForm) {
    siteForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const publicBaseUrl = document.getElementById('publicBaseUrl').value.trim();
      siteStatus.classList.remove('hidden', 'ok', 'err');
      siteStatus.textContent = 'Saving...';
      try {
        const res = await fetch('save-site.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicBaseUrl: publicBaseUrl })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Save failed');
        siteStatus.classList.add('ok');
        siteStatus.textContent = data.message || 'Saved.';
        if (data.resolvedUrl) window.renderArGameQr(data.resolvedUrl);
      } catch (err) {
        siteStatus.classList.add('err');
        siteStatus.textContent = err.message || 'Save failed';
      }
    });
  }

  const uploadHint = document.getElementById('openUploadHint');
  if (uploadHint) {
    uploadHint.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'compile-target.php';
    });
  }
})();