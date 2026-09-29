(() => {
  'use strict';

  const grid = document.getElementById('grid');
  const statusEl = document.getElementById('status');
  const emptyEl = document.getElementById('empty');
  const syncDot = document.getElementById('syncDot');
  const dialog = document.getElementById('detailDialog');
  const detailContent = document.getElementById('detailContent');
  const closeDetail = document.getElementById('closeDetail');

  let state = { items: [], photosByItem: new Map() };
  let currentSignature = '';
  let refreshInFlight = null;
  const photoUrls = new Map();

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function signature(data) {
    return JSON.stringify({
      i: data.items.map(x => [x.id, x.updated_at, x.sort_order, x.name, x.description]),
      p: data.photos.map(x => [x.item_id, x.storage_path, x.sort_order])
    });
  }

  function setSync(mode) {
    syncDot.classList.toggle('busy', mode === 'busy');
    syncDot.classList.toggle('error', mode === 'error');
    syncDot.title = mode === 'busy' ? 'Mise à jour…' : mode === 'error' ? 'Mise à jour impossible' : 'À jour';
  }

  function groupPhotos(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.item_id)) map.set(row.item_id, []);
      map.get(row.item_id).push(row);
    }
    for (const list of map.values()) {
      list.sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    }
    return map;
  }

  async function photoUrl(path) {
    if (!path) return null;
    if (photoUrls.has(path)) return photoUrls.get(path);
    const blob = await ShowcaseCloud.downloadPhoto(path);
    const url = URL.createObjectURL(blob);
    photoUrls.set(path, url);
    return url;
  }

  function cleanupPhotoUrls(photos) {
    const keep = new Set(photos.map(p => p.storage_path));
    for (const [path, url] of photoUrls.entries()) {
      if (!keep.has(path)) {
        URL.revokeObjectURL(url);
        photoUrls.delete(path);
      }
    }
  }

  function cardSkeleton(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'watchCard';
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="thumbWrap"><div class="thumb placeholder"><span>⌚</span></div></div>
      <div class="cardName">${escapeHtml(item.name || 'Montre')}</div>
    `;
    card.addEventListener('click', () => openDetail(item.id));
    return card;
  }

  async function renderGrid() {
    grid.innerHTML = '';
    emptyEl.hidden = state.items.length !== 0;
    statusEl.hidden = true;

    for (const item of state.items) {
      const card = cardSkeleton(item);
      grid.appendChild(card);
      const first = state.photosByItem.get(item.id)?.[0];
      if (!first) continue;
      try {
        const url = await photoUrl(first.storage_path);
        if (!card.isConnected) continue;
        const wrap = card.querySelector('.thumbWrap');
        wrap.innerHTML = `<img class="thumb" src="${url}" alt="${escapeHtml(item.name || 'Montre')}" loading="lazy">`;
      } catch (_) {}
    }
  }

  async function openDetail(itemId) {
    const item = state.items.find(x => x.id === itemId);
    if (!item) return;
    const photos = state.photosByItem.get(itemId) || [];

    detailContent.innerHTML = `
      <div class="detailHead">
        <div class="detailEyebrow">Bruno’s Showcase</div>
        <h2>${escapeHtml(item.name || 'Montre')}</h2>
      </div>
      <div class="detailGallery" id="detailGallery">
        ${photos.length ? photos.map(() => '<div class="detailPhoto loading"></div>').join('') : '<div class="noPhoto">Aucune photo</div>'}
      </div>
      ${item.description ? `<div class="description">${escapeHtml(item.description).replaceAll('\n','<br>')}</div>` : ''}
    `;
    dialog.showModal();
    document.body.classList.add('modalOpen');

    const slots = [...detailContent.querySelectorAll('.detailPhoto')];
    await Promise.all(photos.map(async (p, i) => {
      try {
        const url = await photoUrl(p.storage_path);
        if (!slots[i]?.isConnected) return;
        slots[i].classList.remove('loading');
        slots[i].innerHTML = `<img src="${url}" alt="${escapeHtml(item.name || 'Montre')} — photo ${i + 1}" loading="lazy">`;
      } catch (_) {
        if (slots[i]) slots[i].textContent = 'Photo indisponible';
      }
    }));
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    document.body.classList.remove('modalOpen');
  }
  closeDetail.addEventListener('click', closeDialog);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => document.body.classList.remove('modalOpen'));

  async function refresh({ silent = false } = {}) {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      if (!silent) statusEl.hidden = false;
      setSync('busy');
      try {
        const data = await ShowcaseCloud.fetchShowcase();
        const nextSig = signature(data);
        if (nextSig !== currentSignature) {
          currentSignature = nextSig;
          state = { items: data.items || [], photosByItem: groupPhotos(data.photos || []) };
          cleanupPhotoUrls(data.photos || []);
          await renderGrid();
          const openId = detailContent.querySelector('.detailHead') && dialog.open
            ? state.items.find(x => detailContent.querySelector('h2')?.textContent === (x.name || 'Montre'))?.id
            : null;
          if (dialog.open && !openId) closeDialog();
        } else if (!silent) {
          statusEl.hidden = true;
        }
        setSync('ok');
      } catch (err) {
        console.error(err);
        setSync('error');
        if (!state.items.length) {
          statusEl.hidden = false;
          statusEl.textContent = 'Impossible de charger la sélection pour le moment.';
        }
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  refresh();
  setInterval(() => refresh({ silent: true }), 20000);
  window.addEventListener('focus', () => refresh({ silent: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh({ silent: true });
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
