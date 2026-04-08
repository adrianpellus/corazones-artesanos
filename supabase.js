const SUPABASE_URL = 'https://fxarjfcgrfsfqihhrvis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4YXJqZmNncmZzZnFpaGhydmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODM2NjUsImV4cCI6MjA5MDQ1OTY2NX0.8RpATcL6Mjj21yRxiXaGjaTczX2srYk5hz79cZHzmgY';

const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function sbGet(key) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/store_data?key=eq.${key}&select=value`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.length ? data[0].value : null;
}

async function sbSet(key, value) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/store_data`,
    {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value })
    }
  );
  return res.ok;
}

// Upload image to Supabase Storage and return its public URL
// Requires a public bucket named "productos" in your Supabase project
async function sbUploadImage(dataUrl, filename) {
  try {
    const fetchRes = await fetch(dataUrl);
    const blob = await fetchRes.blob();
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/productos/${filename}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': blob.type || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: blob
      }
    );
    if (!uploadRes.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/productos/${filename}`;
  } catch (e) {
    return null;
  }
}
