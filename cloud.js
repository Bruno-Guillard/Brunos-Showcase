(() => {
  'use strict';

  const SUPABASE_URL = 'https://busesheskvlgpuewlskj.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_H1S2zvSN61JJ1nzl8-jOww_8JuynSJP';
  const BUCKET = 'folio-photos';

  const headers = {
    apikey: PUBLISHABLE_KEY,
    Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json'
  };

  async function rpc(name) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers,
      body: '{}',
      cache: 'no-store'
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = data?.message || data?.hint || data?.error || `Erreur ${response.status}`;
      throw new Error(msg);
    }
    return Array.isArray(data) ? data : [];
  }

  const encodePath = path => String(path).split('/').map(encodeURIComponent).join('/');

  async function downloadPhoto(path) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${encodePath(path)}`, {
      method: 'GET',
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` },
      cache: 'force-cache'
    });
    if (!response.ok) throw new Error(`Photo inaccessible (${response.status})`);
    return await response.blob();
  }

  window.ShowcaseCloud = {
    async fetchShowcase() {
      const [items, photos] = await Promise.all([
        rpc('folio_showcase_items_v2'),
        rpc('folio_showcase_photos')
      ]);
      return { items, photos };
    },
    downloadPhoto
  };
})();
