/* ==========================================================================
   AgroPost - Instagram Management & Auto-Publisher Logic
   ========================================================================== */

// DEFAULT PRESET ASSETS (Lengkap dengan URL Publik Online Aktif untuk Meta API)
const DEFAULT_ASSETS = [
  { id: 'a10', name: 'Sensor Tanah IoT Makro', path: 'assets/ig_soil_probe_iot.jpg', onlineUrl: 'https://files.catbox.moe/hvrcfg.jpg', format: 'feed' },
  { id: 'a9', name: 'Traktor Otonom Sawah', path: 'assets/ig_smart_tractor.jpg', onlineUrl: 'https://files.catbox.moe/l112s8.jpg', format: 'feed' },
  { id: 'a11', name: 'Agronomis Lab Vertikal', path: 'assets/ig_agronomist_lab.jpg', onlineUrl: 'https://files.catbox.moe/ggv10t.jpg', format: 'feed' },
  { id: 'a12', name: 'Peta Spasial NDVI Udara', path: 'assets/ig_aerial_ndvi_farm.jpg', onlineUrl: 'https://files.catbox.moe/no8k21.jpg', format: 'feed' },
  { id: 'a6', name: 'Smart Greenhouse IoT', path: 'assets/ig_greenhouse_iot.jpg', onlineUrl: 'https://files.catbox.moe/blkicc.jpg', format: 'feed' },
  { id: 'a7', name: 'Drone Multispektral', path: 'assets/ig_drone_multispectral.jpg', onlineUrl: 'https://files.catbox.moe/8fahla.jpg', format: 'feed' },
  { id: 'a8', name: 'Hasil Panen Melimpah', path: 'assets/ig_harvest_success.jpg', onlineUrl: 'https://files.catbox.moe/m3c6uz.jpg', format: 'feed' },
  { id: 'a3', name: 'Sensor Fertigasi Presisi', path: 'assets/ig_edu_precision_fertigation.jpg', onlineUrl: 'https://files.catbox.moe/n2cm1p.jpg', format: 'feed' },
  { id: 'a4', name: 'Satelit NDVI Lahan', path: 'assets/ig_promo_satellite_ndvi.jpg', onlineUrl: 'https://files.catbox.moe/pofwlf.jpg', format: 'feed' },
  { id: 'a2', name: 'Carousel 5 Tanda 1:1', path: 'assets/ig_edu_carousel_1.jpg', onlineUrl: 'https://files.catbox.moe/j84sma.jpg', format: 'feed' },
  { id: 'a1', name: 'Reels Promo 9:16', path: 'assets/ig_reels_promo_1.jpg', onlineUrl: 'https://files.catbox.moe/wznkp3.jpg', format: 'reels' },
  { id: 'a5', name: 'Logo Circuit Leaf', path: 'assets/ig_profile_logo_1.jpg', onlineUrl: 'https://files.catbox.moe/l6km1s.jpg', format: 'feed' },
  { id: 'a13', name: 'Poster Edukasi IoT & Smart Farm', path: 'assets/ig_edukasi_iot_laptop.jpg', onlineUrl: 'https://files.catbox.moe/wznkp3.jpg', format: 'feed' },
  { id: 'a14', name: 'Poster Digitalisasi Kebun ERP', path: 'assets/ig_edukasi_digitalisasi_kebun.jpg', onlineUrl: 'https://files.catbox.moe/blkicc.jpg', format: 'feed' },
];

// DEFAULT SEED POSTS (DIISI OTOMATIS DARI TEMA KONSULTAN TERANG BULAN)
const INITIAL_POSTS = [];

// APP STATE
let postsData = [];
let currentSelectedAsset = DEFAULT_ASSETS[0].path;
let currentPostFormat = 'reels';
let editingPostId = null;

// INIT ON DOM LOAD
document.addEventListener('DOMContentLoaded', () => {
  loadPostsFromStorage();
  initAssetPicker();
  initFormDates();
  renderAllTables();
  renderCalendar();
  updateLivePreview();
  startAutoSchedulerWatcher();
});

// 1. STORAGE MANAGEMENT
function loadPostsFromStorage() {
  const stored = localStorage.getItem('agropost_posts');
  if (stored) {
    try {
      postsData = JSON.parse(stored);
      // Migrasi update contact person pada seed posts jika masih format lama
      postsData.forEach(p => {
        if (p.caption && (p.caption.includes('@agrotech.id') || p.caption.includes('6281234567890'))) {
          p.caption = p.caption
            .replace(/link di BIO @agrotech\.id/gi, 'WhatsApp Amanda (0857-1385-0615) / Hardadi (0813-1307-8216)')
            .replace(/link di bio @agrotech\.id/gi, 'WhatsApp Amanda (0857-1385-0615) / Hardadi (0813-1307-8216)')
            .replace(/agrotech\.id/gi, 'cvagrotechnology');
        }
      });

      // Migrasi konten baru Terang Bulan Consulting
      if (!postsData.some(p => p.id === 'post-tb-1')) {
        postsData = [...INITIAL_POSTS];
      } else {
        INITIAL_POSTS.forEach(initPost => {
          if (!postsData.some(p => p.id === initPost.id)) {
            postsData.unshift(initPost);
          }
        });
      }
      savePostsToStorage();
    } catch (e) {
      postsData = [...INITIAL_POSTS];
    }
  } else {
    postsData = [...INITIAL_POSTS];
    savePostsToStorage();
  }
}

function savePostsToStorage() {
  localStorage.setItem('agropost_posts', JSON.stringify(postsData));
  updateMetrics();
}

function updateMetrics() {
  const total = postsData.length;
  const scheduled = postsData.filter(p => p.status === 'scheduled').length;
  
  const elTotal = document.getElementById('statTotalPosts');
  const elSched = document.getElementById('statScheduled');
  const elBadge = document.getElementById('queueCountBadge');

  if (elTotal) elTotal.innerText = total;
  if (elSched) elSched.innerText = scheduled;
  if (elBadge) elBadge.innerText = scheduled;
}

// 2. TAB SWITCHING
function switchTab(tabId, navElement) {
  // Update nav active
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (navElement) {
    navElement.classList.add('active');
  } else {
    const match = Array.from(document.querySelectorAll('.nav-item')).find(item => item.getAttribute('onclick')?.includes(tabId));
    if (match) match.classList.add('active');
  }

  // Update view
  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`tab-${tabId}`);
  if (targetView) targetView.classList.add('active');

  // Title
  const titles = {
    'dashboard': 'Dashboard Overview',
    'creator': 'Post Creator & Live Studio',
    'ai-generator': 'AI Content Generator & Pre-Flight Review',
    'queue': 'Antrean & Jadwal Konten',
    'calendar': 'Kalender Editorial Instagram',
    'hashtags': 'Bank Hashtag Agribisnis',
    'api-settings': 'Meta Graph API Integrator'
  };
  const currentTitle = document.getElementById('currentViewTitle');
  if (currentTitle) currentTitle.innerText = titles[tabId] || 'AgroPost Manager';

  // Rerender if calendar
  if (tabId === 'calendar') renderCalendar();
  if (tabId === 'queue') renderAllTables();
}

// 3. ASSET PICKER
function initAssetPicker() {
  const container = document.getElementById('assetPickerGrid');
  if (!container) return;
  container.innerHTML = '';

  DEFAULT_ASSETS.forEach((asset, idx) => {
    const div = document.createElement('div');
    div.className = `asset-thumb ${idx === 0 ? 'selected' : ''}`;
    div.innerHTML = `<img src="${asset.path}" alt="${asset.name}" title="${asset.name}">`;
    div.onclick = () => {
      document.querySelectorAll('.asset-thumb').forEach(t => t.classList.remove('selected'));
      div.classList.add('selected');
      currentSelectedAsset = asset.path;
      const publicInput = document.getElementById('publicMediaUrlInput');
      if (publicInput) {
        publicInput.value = asset.onlineUrl || 'https://files.catbox.moe/j84sma.jpg';
      }
      updateLivePreview();
    };
    container.appendChild(div);
  });
}

function handleCustomFileUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentSelectedAsset = e.target.result;
      
      // Prepend to asset picker
      const container = document.getElementById('assetPickerGrid');
      const div = document.createElement('div');
      div.className = 'asset-thumb selected';
      div.innerHTML = `<img src="${currentSelectedAsset}" alt="Custom Upload">`;
      div.onclick = () => {
        document.querySelectorAll('.asset-thumb').forEach(t => t.classList.remove('selected'));
        div.classList.add('selected');
        currentSelectedAsset = div.querySelector('img').src;
        updateLivePreview();
      };
      
      document.querySelectorAll('.asset-thumb').forEach(t => t.classList.remove('selected'));
      container.prepend(div);
      updateLivePreview();
      showToast('Gambar kustom berhasil dimuat ke editor!');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 4. FORMAT PILLS
function setPostFormat(format, element) {
  currentPostFormat = format;
  document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
  element.classList.add('active');

  const container = document.getElementById('phoneMediaContainer');
  if (container) {
    container.className = 'phone-media-container';
    if (format === 'carousel') container.classList.add('ratio-4-5');
    else if (format === 'reels') container.classList.add('ratio-9-16');
  }
  updateLivePreview();
}

// 5. LIVE PREVIEW SYNC
function updateLivePreview() {
  const captionInput = document.getElementById('postCaptionInput');
  const previewText = document.getElementById('phoneCaptionText');
  const previewImg = document.getElementById('phoneMediaImg');
  const charCounter = document.getElementById('charCounter');

  if (previewImg) previewImg.src = currentSelectedAsset;

  const rawText = captionInput ? captionInput.value : '';
  if (charCounter) charCounter.innerText = `${rawText.length} / 2.200 Karakter`;

  if (previewText) {
    if (!rawText.trim()) {
      previewText.innerText = 'Pratinjau caption Instagram Anda akan tampil di sini secara real-time...';
    } else {
      previewText.innerText = rawText;
    }
  }
}

function initFormDates() {
  const dateInput = document.getElementById('postScheduleDate');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }
}

// 6. SAVE / PUBLISH / SCHEDULE POST
function savePost(targetStatus) {
  const topic = document.getElementById('postTopicInput').value.trim() || 'Postingan Agrotech';
  const category = document.getElementById('postCategorySelect').value;
  let caption = document.getElementById('postCaptionInput').value.trim();
  const date = document.getElementById('postScheduleDate').value;
  const time = document.getElementById('postScheduleTime').value;

  // Auto-fill default caption if empty so publishing never blocks
  if (!caption) {
    caption = `Solusi Smart Farming & Agribisnis Modern bersama Agrotech Indonesia! 🌾✨\n\nOptimalkan hasil panen, pantau kelembaban tanah dengan sensor IoT cerdas, dan rekap operasional kebun dalam 1 aplikasi cloud.\n\n👉 Info selengkapnya & request demo gratis: https://agrotech.id\n\n#Agrotech #SmartFarming #PertanianModern #IoTPertanian #cvagrotechnology`;
    document.getElementById('postCaptionInput').value = caption;
    updateLivePreview();
  }

  let postToPublish = null;

  if (editingPostId) {
    const idx = postsData.findIndex(p => p.id === editingPostId);
    if (idx !== -1) {
      postsData[idx] = {
        ...postsData[idx],
        topic,
        category,
        format: currentPostFormat,
        mediaUrl: currentSelectedAsset,
        caption,
        date: date || '2026-09-02',
        time: time || '08:00',
        status: targetStatus
      };
      postToPublish = postsData[idx];
    }
    editingPostId = null;
    showToast('Postingan berhasil diperbarui!');
  } else {
    const newPost = {
      id: 'post-' + Date.now(),
      topic,
      category,
      format: currentPostFormat,
      mediaUrl: currentSelectedAsset,
      caption,
      date: date || '2026-09-02',
      time: time || '08:00',
      status: targetStatus
    };
    postsData.unshift(newPost);
    postToPublish = newPost;
  }

  if (targetStatus === 'published' && postToPublish) {
    attemptMetaGraphPublish(postToPublish);
  } else if (targetStatus === 'scheduled') {
    showToast('📅 Postingan berhasil dijadwalkan!');
  } else {
    showToast('💾 Draf berhasil disimpan!');
  }

  savePostsToStorage();
  renderAllTables();
  renderCalendar();
  switchTab('queue');
}

// 7. EDIT & DELETE POSTS
function editPost(id) {
  const post = postsData.find(p => p.id === id);
  if (!post) return;

  editingPostId = post.id;
  document.getElementById('postTopicInput').value = post.topic;
  document.getElementById('postCategorySelect').value = post.category;
  document.getElementById('postCaptionInput').value = post.caption;
  document.getElementById('postScheduleDate').value = post.date;
  document.getElementById('postScheduleTime').value = post.time;

  currentSelectedAsset = post.mediaUrl;
  currentPostFormat = post.format;

  // Set format pill
  const pills = document.querySelectorAll('.format-pill');
  pills.forEach(p => {
    if (p.innerText.toLowerCase().includes(post.format)) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  updateLivePreview();
  switchTab('creator');
  showToast('Memuat data postingan ke editor...');
}

function deletePost(id) {
  if (confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
    postsData = postsData.filter(p => p.id !== id);
    savePostsToStorage();
    renderAllTables();
    renderCalendar();
    showToast('Postingan berhasil dihapus.');
  }
}

function quickPublish(id) {
  const post = postsData.find(p => p.id === id);
  if (post) {
    post.status = 'published';
    savePostsToStorage();
    renderAllTables();
    renderCalendar();
    attemptMetaGraphPublish(post);
  }
}

// 8. RENDER TABLES
function renderAllTables() {
  const dashBody = document.getElementById('dashboardRecentBody');
  const fullBody = document.getElementById('fullQueueTableBody');

  if (dashBody) dashBody.innerHTML = '';
  if (fullBody) fullBody.innerHTML = '';

  postsData.forEach((post, idx) => {
    const statusMap = {
      'published': '<span class="status-badge badge-published"><i class="ri-check-line"></i> Terbit</span>',
      'scheduled': `<span class="status-badge badge-scheduled"><i class="ri-time-line"></i> Terjadwal: ${post.date}</span>`,
      'draft': '<span class="status-badge badge-draft"><i class="ri-draft-line"></i> Draf</span>'
    };

    const formatLabel = {
      'reels': '<span style="color:#EC4899;"><i class="ri-film-line"></i> Reels 9:16</span>',
      'carousel': '<span style="color:#3B82F6;"><i class="ri-pages-line"></i> Carousel</span>',
      'feed': '<span style="color:#10B981;"><i class="ri-image-line"></i> Feed 1:1</span>'
    };

    const previewSnippet = post.caption.substring(0, 65).replace(/[\r\n]+/g, ' ') + '...';

    const rowHtml = `
      <tr>
        <td>
          <div class="table-thumb">
            <img src="${post.mediaUrl}" alt="${post.topic}">
          </div>
        </td>
        <td>
          <strong style="color:#fff; display:block;">${post.topic}</strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">${previewSnippet}</span>
        </td>
        <td>${formatLabel[post.format] || 'Feed'}</td>
        <td>${statusMap[post.status] || post.status}</td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-secondary" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="editPost('${post.id}')" title="Edit">
              <i class="ri-edit-line"></i>
            </button>
            ${post.status !== 'published' ? `
              <button class="btn btn-primary" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="quickPublish('${post.id}')" title="Publish Sekarang">
                <i class="ri-send-plane-line"></i>
              </button>
            ` : ''}
            <button class="btn btn-outline-danger" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="deletePost('${post.id}')" title="Hapus">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;

    // Add first 4 to dashboard table
    if (dashBody && idx < 4) {
      dashBody.insertAdjacentHTML('beforeend', rowHtml);
    }

    // Add all to full queue table
    if (fullBody) {
      const fullRowHtml = `
        <tr>
          <td>
            <div class="table-thumb">
              <img src="${post.mediaUrl}" alt="${post.topic}">
            </div>
          </td>
          <td>
            <strong style="color:#fff; display:block;">${post.topic}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">${previewSnippet}</span>
          </td>
          <td>${formatLabel[post.format] || 'Feed'}</td>
          <td>${statusMap[post.status] || post.status}</td>
          <td><i class="ri-calendar-line"></i> ${post.date} (${post.time})</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-secondary" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="editPost('${post.id}')" title="Edit">
                <i class="ri-edit-line"></i> Edit
              </button>
              <button class="btn btn-outline-danger" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="deletePost('${post.id}')" title="Hapus">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      fullBody.insertAdjacentHTML('beforeend', fullRowHtml);
    }
  });

  updateMetrics();
}

// 9. CALENDAR RENDERING
function renderCalendar() {
  const container = document.getElementById('calendarCellsContainer');
  if (!container) return;
  container.innerHTML = '';

  // Sept 2026 calendar starts on Tuesday (offset 1 day)
  const totalDays = 30;
  const startDayOffset = 1; // 0=Mon, 1=Tue

  // Empty leading days
  for (let i = 0; i < startDayOffset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day-cell';
    emptyCell.style.opacity = '0.3';
    container.appendChild(emptyCell);
  }

  // Days 1 to 30
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `2026-09-${d < 10 ? '0' + d : d}`;
    const dayPosts = postsData.filter(p => p.date === dateStr);

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.innerHTML = `<span class="cal-day-num">${d} Sep</span>`;

    dayPosts.forEach(p => {
      const pill = document.createElement('div');
      pill.className = 'cal-event-pill';
      if (p.status === 'published') {
        pill.style.background = 'rgba(16, 185, 129, 0.2)';
        pill.style.color = '#10B981';
      } else if (p.status === 'scheduled') {
        pill.style.background = 'rgba(59, 130, 246, 0.2)';
        pill.style.color = '#3B82F6';
      } else {
        pill.style.background = 'rgba(245, 158, 11, 0.2)';
        pill.style.color = '#F59E0B';
      }
      pill.innerText = `${p.time} ${p.topic}`;
      pill.title = `${p.topic} (${p.status})`;
      pill.onclick = () => editPost(p.id);
      cell.appendChild(pill);
    });

    container.appendChild(cell);
  }
}

function generateDefaultCalendar() {
  postsData = [...INITIAL_POSTS];
  savePostsToStorage();
  renderAllTables();
  renderCalendar();
  showToast('Jadwal konten default berhasil di-reset!');
}

// 10. AI CAPTION PRESETS & HASHTAG APPRENDER
function applyCaptionTemplate(type) {
  const targetPost = INITIAL_POSTS.find(p => p.category === type) || INITIAL_POSTS[0];
  document.getElementById('postCaptionInput').value = targetPost.caption;
  document.getElementById('postTopicInput').value = targetPost.topic;
  updateLivePreview();
  showToast('Template caption berhasil diterapkan!');
}

function appendHashtags(tagType) {
  const textarea = document.getElementById('postCaptionInput');
  if (!textarea) return;

  const tags = {
    'agritech': '\n\n#Agrotech #SmartFarming #Pertanian40 #IoTPertanian #AgriTechIndonesia #PetaniMaju #SaaSPertanian',
    'smartfarm': '\n\n#PertanianPresisi #SmartNursery #SensorTanah #FertigasiPresisi #HematPupuk #GreenhouseIndonesia',
    'b2b': '\n\n#SmartFarmingERP #KelolaKebun #AgribisnisIndonesia #CloudSaaS #ERPIndonesia #ManajemenPerkebunan'
  };

  textarea.value += (tags[tagType] || '');
  updateLivePreview();
  showToast('Hashtag niche berhasil ditambahkan!');
}

function quickNewPost(category) {
  const match = INITIAL_POSTS.find(p => p.category === category) || INITIAL_POSTS[0];
  document.getElementById('postTopicInput').value = match.topic;
  document.getElementById('postCategorySelect').value = match.category;
  document.getElementById('postCaptionInput').value = match.caption;
  currentSelectedAsset = match.mediaUrl;
  currentPostFormat = match.format;
  editingPostId = null;

  updateLivePreview();
  switchTab('creator');
}

// 11. META GRAPH API GENERATOR
function generatePythonScript() {
  const userId = document.getElementById('apiIgUserId').value || '17841405829103841';
  const token = document.getElementById('apiAccessToken').value || 'EAAG_TOKEN';
  const caption = (document.getElementById('postCaptionInput').value || 'Postingan Agrotech').replace(/"/g, '\\"');

  const script = `# Script Otomatisasi Upload Instagram Agrotech (Meta Graph API v19.0)
import requests

IG_USER_ID = "${userId}"
ACCESS_TOKEN = "${token}"
IMAGE_URL = "https://agrotech.id/${currentSelectedAsset}"
CAPTION = """${caption}"""

# Langkah 1: Buat Media Container
url_container = f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media"
payload_container = {
    'image_url': IMAGE_URL,
    'caption': CAPTION,
    'access_token': ACCESS_TOKEN
}
res_container = requests.post(url_container, data=payload_container).json()
container_id = res_container.get('id')
print("Media Container ID:", container_id)

# Langkah 2: Publikasikan Container ke Feed/Reels
url_publish = f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media_publish"
payload_publish = {
    'creation_id': container_id,
    'access_token': ACCESS_TOKEN
}
res_publish = requests.post(url_publish, data=payload_publish).json()
print("Hasil Publikasi:", res_publish)
`;

  document.getElementById('pythonScriptBox').innerText = script;
  switchTab('api-settings');
  showToast('Python Poster Script berhasil di-generate!');
}

function saveApiCredentials() {
  const userId = document.getElementById('apiIgUserId').value.trim();
  const token = document.getElementById('apiAccessToken').value.trim();
  localStorage.setItem('agropost_ig_user_id', userId);
  localStorage.setItem('agropost_access_token', token);
  showToast('✓ Kredensial Meta & Token Instagram berhasil disimpan!');
}

function getBridgeApiUrl(endpoint) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.origin}${endpoint}`;
  }
  return endpoint;
}

// 11. TESTING TOKEN KONEKSI KE META
async function testInstagramToken() {
  const token = localStorage.getItem('agropost_access_token') || document.getElementById('apiAccessToken')?.value?.trim();
  const userId = localStorage.getItem('agropost_ig_user_id') || document.getElementById('apiIgUserId')?.value?.trim() || '17841433558793598';
  
  if (!token || token.includes('SAMPLE_TOKEN') || token.length < 20) {
    alert('Silakan masukkan Token Akses Instagram Anda (yang berawalan IGAAT... atau EAAG...) terlebih dahulu di kolom.');
    return;
  }
  
  showToast('⏳ Menguji koneksi ke server Meta Graph API...');
  
  // 1. Coba lewat Bridge Server (Lokal maupun Vercel Serverless)
  try {
    const bridgeRes = await fetch(getBridgeApiUrl('/api/test-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, user_id: userId })
    });
    const bridgeData = await bridgeRes.json();
    if (bridgeData.success) {
      const username = bridgeData.data.username || bridgeData.data.name || 'cvagrotechnology';
      alert(`✅ KONEKSI META GRAPH API BERHASIL!\n\nAkun Terhubung: @${username}\nID Akun: ${bridgeData.data.id}\n\nSistem siap menerbitkan postingan langsung ke akun Instagram Anda.`);
      showToast(`✅ Akun @${username} Terverifikasi & Siap Posting!`);
      return;
    } else if (bridgeData.error) {
      const err = bridgeData.error.error || bridgeData.error;
      alert(`[Meta API Error]\n${err.message || JSON.stringify(err)}`);
      return;
    }
  } catch (bridgeErr) {
    console.log('Bridge server tidak merespon, mencoba direct fetch...', bridgeErr);
  }

  // 2. Fallback Direct Fetch
  try {
    const isInstagramLogin = token.startsWith('IG');
    const testUrl = isInstagramLogin 
      ? `https://graph.instagram.com/v19.0/me?fields=id,username&access_token=${token}`
      : `https://graph.facebook.com/v19.0/${userId}?fields=id,name,username&access_token=${token}`;
    
    const res = await fetch(testUrl);
    const data = await res.json();
    
    if (data.error) {
      alert(`[Meta Error] ${data.error.message}\n(Tipe: ${data.error.type}, Kode: ${data.error.code})`);
    } else {
      const username = data.username || data.name || 'cvagrotechnology';
      alert(`✅ KONEKSI META GRAPH API BERHASIL!\n\nAkun Terhubung: @${username}\nID Akun: ${data.id}\n\nSistem siap menerbitkan postingan langsung ke akun Instagram Anda.`);
      showToast(`✅ Akun @${username} Terverifikasi & Siap Posting!`);
    }
  } catch (err) {
    console.error('Test connection error:', err);
    alert(`[Info Jaringan Browser]\nBrowser membatasi direct check (CORS). Silakan buka aplikasi melalui server lokal: http://localhost:8000/ig-manager.html agar koneksi lancar.`);
  }
}

// 12. LIVE GRAPH API PUBLISHER
async function attemptMetaGraphPublish(post) {
  let userId = localStorage.getItem('agropost_ig_user_id') || document.getElementById('apiIgUserId')?.value?.trim() || '17841433558793598';
  let token = localStorage.getItem('agropost_access_token') || document.getElementById('apiAccessToken')?.value?.trim() || '';

  // Prompt user if token is missing
  if (!token || token.includes('SAMPLE_TOKEN') || token.length < 20) {
    const entered = prompt('Masukkan Token Akses Instagram Anda (yang tadi disalin dari Meta Developer, berawalan IGAAT...):');
    if (entered && entered.trim().length > 20) {
      token = entered.trim();
      localStorage.setItem('agropost_access_token', token);
      const inputEl = document.getElementById('apiAccessToken');
      if (inputEl) inputEl.value = token;
    } else {
      showToast('⚠️ Token belum dimasukkan. Postingan disimpan sebagai draf lokal.');
      return;
    }
  }

  showToast('⏳ Mempersiapkan Media Container ke Meta Graph API...');
  
  // Resolve Public Media URL (Meta server requires public HTTPS URL)
  let targetMediaUrl = '';

  // Priority 1: Check post's own mediaUrl if it's already an online HTTP URL (Catbox / CDN)
  if (post && post.mediaUrl && post.mediaUrl.startsWith('http')) {
    targetMediaUrl = post.mediaUrl;
  }
  // Priority 2: Check if post has a data:image base64 canvas graphic
  else if (post && post.localMedia && post.localMedia.startsWith('data:image')) {
    targetMediaUrl = post.localMedia;
  }
  else if (post && post.mediaUrl && post.mediaUrl.startsWith('data:image')) {
    targetMediaUrl = post.mediaUrl;
  }
  // Priority 3: Resolve local path against DEFAULT_ASSETS onlineUrl mapping
  else if (post && (post.localMedia || post.mediaUrl)) {
    const rawPath = (post.localMedia || post.mediaUrl).replace(/^\.\//, '');
    const found = DEFAULT_ASSETS.find(a => a.path === rawPath || rawPath.includes(a.path) || a.path.includes(rawPath));
    if (found && found.onlineUrl) {
      targetMediaUrl = found.onlineUrl;
    } else {
      targetMediaUrl = rawPath;
    }
  }
  // Priority 4: Fallback to manual publicMediaUrlInput ONLY if post has no media specified
  else if (document.getElementById('publicMediaUrlInput')?.value?.trim().startsWith('http')) {
    targetMediaUrl = document.getElementById('publicMediaUrlInput').value.trim();
  }

  if (!targetMediaUrl) {
    targetMediaUrl = 'https://files.catbox.moe/wznkp3.jpg';
  }

  // 1. Coba lewat AgroPost Bridge Server (Bypass Batasan CORS Browser)
  try {
    showToast('📡 Mengirim postingan melalui AgroPost Bridge...');
    const bridgeRes = await fetch(getBridgeApiUrl('/api/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        user_id: userId,
        caption: post.caption,
        media_url: targetMediaUrl,
        format: post.format
      })
    });
    const bridgeData = await bridgeRes.json();
    if (bridgeData.success) {
      const postId = bridgeData.data.id || 'LIVE';
      post.status = 'published';
      post.metaPostId = postId;
      savePostsToStorage();
      renderAllTables();
      renderCalendar();
      alert(`🎉 SELAMAT! POSTINGAN BERHASIL TAYANG DI INSTAGRAM!\n\nPost ID Meta: ${postId}\nAkun: @cvagrotechnology\n\nSilakan refresh profil Instagram Anda untuk melihat hasilnya.`);
      showToast(`🚀 SUKSES! Postingan telah terbit di @cvagrotechnology!`);
      return;
    } else if (bridgeData.error) {
      const err = bridgeData.error.error || bridgeData.error;
      const errMsg = err.message || JSON.stringify(err);
      console.error('[Meta Bridge Error]', err);
      alert(`[Meta Graph API Error]\n\n${errMsg}\n\nKode Error: ${err.code || 'N/A'}\n\n💡 Catatan: Server Meta Instagram memerlukan izin konten atau URL media online publik.`);
      return;
    }
  } catch (bridgeErr) {
    console.log('Bridge server fallback to direct browser fetch:', bridgeErr);
  }

  // 2. Direct Browser Fetch Fallback
  const isInstagramLogin = token.startsWith('IG');
  const baseUrl = isInstagramLogin ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
  const targetId = isInstagramLogin ? (userId || 'me') : userId;

  try {
    // 1. Create Container
    const containerUrl = `${baseUrl}/${targetId}/media`;
    const containerBody = new URLSearchParams({
      caption: post.caption,
      access_token: token
    });

    if (post.format === 'reels') {
      containerBody.append('media_type', 'REELS');
      containerBody.append('video_url', targetMediaUrl);
    } else {
      containerBody.append('image_url', targetMediaUrl);
    }

    showToast('📡 Mengirim langsung ke server Instagram Meta...');
    const res1 = await fetch(containerUrl, {
      method: 'POST',
      body: containerBody
    });
    const data1 = await res1.json();

    if (data1.error) {
      console.error('[Meta API Error]', data1.error);
      alert(`[Meta API Error: Gagal Membuat Media Container]\n\nPesan: ${data1.error.message}\nKode: ${data1.error.code}`);
      return;
    }

    const creationId = data1.id;
    showToast(`✓ Media Container dibuat (ID: ${creationId}). Mempublikasikan ke Feed...`);

    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    // 2. Publish Container
    const publishUrl = `${baseUrl}/${targetId}/media_publish`;
    const publishBody = new URLSearchParams({
      creation_id: creationId,
      access_token: token
    });

    const res2 = await fetch(publishUrl, {
      method: 'POST',
      body: publishBody
    });
    const data2 = await res2.json();

    if (data2.error) {
      console.error('[Meta API Publish Error]', data2.error);
      alert(`[Meta API Error saat Publish]\n${data2.error.message} (Kode: ${data2.error.code})`);
    } else {
      post.status = 'published';
      post.metaPostId = data2.id;
      savePostsToStorage();
      renderAllTables();
      renderCalendar();
      alert(`🎉 SELAMAT! POSTINGAN BERHASIL TAYANG DI INSTAGRAM!\n\nPost ID Meta: ${data2.id}\nAkun: @cvagrotechnology\n\nSilakan refresh profil Instagram Anda.`);
      showToast(`🚀 SUKSES! Postingan telah terbit di @cvagrotechnology! (ID: ${data2.id})`);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    alert(`[Info Keamanan Browser (CORS)]\nBrowser membatasi panggilan HTTP langsung ke server pihak ketiga (Meta).\n\n✅ SOLUSI:\nBuka aplikasi melalui server lokal yang sudah aktif:\n👉 http://localhost:8080/ig-manager.html`);
  }
}

// 13. BACKGROUND AUTO-SCHEDULER ENGINE
let autoSchedulerInterval = null;
let isPublishingQueue = false;

function startAutoSchedulerWatcher() {
  if (autoSchedulerInterval) clearInterval(autoSchedulerInterval);
  
  // Periksa jadwal setiap 30 detik
  autoSchedulerInterval = setInterval(async () => {
    if (isPublishingQueue) return;
    
    const token = localStorage.getItem('agropost_access_token');
    if (!token || token.length < 20 || token.includes('SAMPLE_TOKEN')) return;
    
    const now = new Date();
    
    // Cari postingan dengan status 'scheduled' yang waktunya telah tiba
    const duePosts = postsData.filter(p => {
      if (p.status !== 'scheduled' || !p.date) return false;
      const scheduledDateTime = new Date(`${p.date}T${p.time || '08:00'}:00`);
      return scheduledDateTime <= now;
    });

    if (duePosts.length > 0) {
      isPublishingQueue = true;
      const target = duePosts[0];
      console.log(`[Auto-Publisher] Waktu tayang tiba untuk: "${target.topic}". Mempublikasikan otomatis...`);
      showToast(`⏰ [Auto-Publish] Mempublikasikan jadwal: "${target.topic}"...`);
      
      try {
        await attemptMetaGraphPublish(target);
      } catch (e) {
        console.error('[Auto-Publish Error]', e);
      } finally {
        isPublishingQueue = false;
      }
    }
  }, 30000);
}

// 12. UTILITY TOAST & COPY
function showToast(msg) {
  const toast = document.getElementById('toastPopup');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function copyDirectText(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    showToast('Teks berhasil disalin ke Clipboard!');
  });
}

// =========================================================================
// 13. AI CONTENT GENERATOR & PRE-FLIGHT REVIEW SYSTEM
// =========================================================================

let generatedVariations = [];
let currentPreFlightPost = null;
let selectedGenAssetId = 'a10';

const AI_CONTENT_DATABASE = {
  iot_sensor: {
    title: 'Smart Farming IoT & Sensor Tanah',
    assetId: 'a10',
    format: 'feed',
    hooks: [
      'Masih cek kelembaban & kesuburan tanah pakai feeling? 🚜🌾',
      'Sensor IoT pintar ini selamatkan kebun dari risiko gagal panen! 📊⚡',
      'Revolusi Pertanian 4.0: Pantau kondisi tanah langsung dari genggaman HP! 📱🌱',
      'Pangkas pemborosan air & pupuk hingga 30% dengan sensor tanah presisi! 💧📉',
      'Deteksi dini anomali pH tanah sebelum tanaman layu dan menguning! ⚠️🍃',
      'Stop bertani dengan metode kira-kira! Saatnya pakai data telemetri real-time! 🚜✨'
    ],
    bodies: {
      educational: `Tahukah kamu? Fluktuasi pH dan kelembaban tanah yang tidak terdeteksi bisa memotong produktivitas tanaman hingga 30%! 📉\n\nDengan **Agrotech IoT Smart Sensor**, kamu bisa:\n✅ Monitoring pH, EC, dan suhu tanah real-time 24/7\n✅ Notifikasi otomatis jika tanah butuh penyiraman\n✅ Analisis tren cuaca mikro langsung di smartphone\n\nTak ada lagi tebak-tebakan. Rawat tanamanmu berdasarkan data presisi! 🌾✨`,
      professional: `Efisiensi biaya dan optimasi yield kini dapat dicapai secara terukur. Sistem IoT Agrotech menyajikan data telemetri tanah real-time untuk mendukung pengambilan keputusan agronomis berbasis data (data-driven farming).\n\n🔹 Akurasi sensor kelas industri\n🔹 Integrasi langsung ke dashboard analitik cloud\n🔹 Pengurangan pemborosan sumber daya air & input nutrisi hingga 30%`,
      innovative: `Masa depan pertanian Indonesia ada di sini! 🇮🇩⚡ Lewat teknologi IoT terkini dari Agrotech, tanah kebunmu kini bisa 'berbicara' memberi tahu kapan butuh air dan nutrisi.\n\nSelamat tinggal metode usang, sambut era panen melimpah dengan teknologi digital presisi! 🚀🌱`,
      storytelling: `Dulu, setiap pagi harus keliling hektaran lahan hanya untuk mencolek tanah dan menebak apakah tanaman butuh air. Seringkali terlambat dan daun mulai layu.\n\nSejak memasang sensor tanah Agrotech, kondisi seluruh blok kebun langsung terpantau dari layar HP saat sarapan pagi. Panen lebih tenang, hasil melonjak! 🚜❤️`
    },
    hashtags: '#SmartFarming #Agrotech #IoTPertanian #SensorTanah #PertanianPresisi #PetaniMilenial #TeknologiPertanian #PertanianIndonesia #PrecisionAg'
  },
  ndvi_satellite: {
    title: 'Citra Satelit NDVI & Pemetaan Drone',
    assetId: 'a12',
    format: 'feed',
    hooks: [
      'Lihat kebun dari luar angkasa: Deteksi tanaman stres sebelum daunnya menguning! 🛰️🌱',
      'Cara cerdas pantau kebun puluhan hektar hanya dalam 5 menit! 🔍⚡',
      'Teknologi Satelit NDVI Agrotech kini hadir untuk perkebunan Indonesia! 🇮🇩🌾',
      'Peta spasial multispektral: Ketahui titik kebun yang kurang pupuk seketika! 🗺️💡',
      'Pantau kesehatan tanaman dari udara: Akurasi tinggi tanpa harus jalan keliling kebun! 🛸🌿',
      'Cegah penyebaran hama lebih awal dengan sistem penginderaan satelit otomatis! 🚨🌾'
    ],
    bodies: {
      educational: `Satelit multispektral mampu menangkap pantulan klorofil daun yang tak terlihat oleh mata manusia biasa. Indeks NDVI (Normalized Difference Vegetation Index) memperlihatkan area mana yang kekurangan nitrogen, terserang hama, atau kekurangan air.\n\nKelebihan Satelit NDVI Agrotech:\n🛰️ Citra satelit diperbarui berkala resolusi tinggi\n🎯 Peta zona warna: Hijau (sehat), Kuning (stres), Merah (kritis)\n⏱️ Hemat waktu survei lapangan hingga 80%`,
      professional: `Manajemen aset perkebunan skala menengah hingga korporasi menuntut visibilitas komprehensif. Solusi Satelit NDVI Agrotech memberikan indeks vegetasi spasial untuk memitigasi anomali pertumbuhan secara dini dan menargetkan intervensi agronomi secara presisi.`,
      innovative: `Siapa bilang teknologi luar angkasa hanya untuk ilmuwan? Sekarang kebun Anda bisa dipantau langsung oleh satelit orbit bumi! Satelit NDVI Agrotech menghadirkan intelijen spasial terbaik untuk hasil panen optimal. 🚀✨`,
      storytelling: `Di lahan seluas 20 hektar, hama sering menyebar diam-diam di bagian tengah tanpa disadari. Ketika ketahuan, sudah terlambat. Tapi dengan citra satelit Agrotech, anomali warna merah langsung muncul di peta HP sebelum menyebar luas! Penyelamatan tepat waktu! 🛰️💪`
    },
    hashtags: '#NDVISatellite #DronePertanian #CitraSatelit #Agrotech #SmartFarmingIndonesia #PemetaanKebun #PertanianModern #AgriTech'
  },
  fertigation: {
    title: 'Fertigasi Presisi & Dosis Nutrisi NPK',
    assetId: 'a3',
    format: 'feed',
    hooks: [
      'Pangkas biaya pupuk hingga 35% dengan sistem Fertigasi Presisi! 💧🌾',
      'Jangan buang pupuk sia-sia: Ini rahasia dosis pupuk tepat sasaran! 🎯⚡',
      'Irigasi pintar otomatis: Tanaman cukup nutrisi, panen naik drastis! 📈🌱',
      'Nutrisi NPK mengalir langsung ke akar tanaman di waktu yang paling tepat! 🌿⏰',
      'Biaya pupuk meroket? Beralih ke sistem fertigasi otomatis berbasis sensor! 💰🌱',
      'Hasil panen buah lebih seragam dan bobot meningkat dengan nutrisi presisi! 🍅🏆'
    ],
    bodies: {
      educational: `Seringkali pupuk terbuang sia-sia karena hanyut terbawa air atau dosis yang tidak sesuai kebutuhan fase vegetatif dan generatif tanaman.\n\nSistem Fertigasi Agrotech menggabungkan penyiraman dan pemupukan secara presisi:\n💧 Dosis NPK terukur berdasarkan pembacaan sensor EC & pH\n⏱️ Otomatisasi jadwal siram sesuai cuaca mikro\n💰 Hemat biaya pupuk kimia hingga 35% sekaligus menjaga kualitas tanah!`,
      professional: `Optimasi input biaya operasional pupuk merupakan faktor krusial dalam margin profit agribisnis. Sistem Fertigasi Otomatis Agrotech memastikan delivery rasio NPK optimal sesuai fase fisiologis tanaman, mengurangi leaching nutrisi, dan mendongkrak efisiensi input.`,
      innovative: `Ubah kebun konvensional menjadi fasilitas budidaya presisi tinggi! Sistem fertigasi Agrotech mengalirkan nutrisi secara mikroskopis langsung ke perakaran tanaman di waktu yang paling optimal. Efisiensi luar biasa untuk petani modern! 🌿⚡`,
      storytelling: `Tiap musim tanam, biaya belanja pupuk selalu jadi beban terbesar. Seringkali tanaman tetap tidak subur karena pupuk menguap atau hanyut. Begitu beralih ke fertigasi presisi Agrotech, kebutuhan pupuk berkurang sepertiga dan pertumbuhan tanaman seragam luar biasa! 🚜🙌`
    },
    hashtags: '#FertigasiPresisi #HematPupuk #IrigasiTetes #NutrisiTanaman #SmartAgri #PupukNPK #Agrotech #KebunModern'
  },
  erp_cloud: {
    title: 'Cloud SaaS & ERP Pembukuan Kebun',
    assetId: 'a11',
    format: 'feed',
    hooks: [
      'Stop rekap hasil panen pakai nota kertas yang gampang hilang! 📒❌',
      'Kelola tonase panen, pekerja, dan biaya kebun dari satu aplikasi cloud! 📊🌾',
      'Sistem ERP Agribisnis terlengkap untuk kebun modern Indonesia! 🇮🇩💼',
      'Mandor input data di pos kebun, malam hari laporan keuangan sudah siap audit! 📱🌙',
      'Transparansi stok gudang dan absensi pekerja kebun dalam satu dashboard! 📦👷',
      'Tingkatkan efisiensi manajerial perkebunan hingga 3x lipat bersama Agrotech ERP! 🚀📈'
    ],
    bodies: {
      educational: `Kebun modern bukan cuma soal bertani, tapi juga manajemen bisnis yang rapi! Sistem ERP Agrotech dirancang khusus untuk alur kerja perkebunan:\n\n📋 Pencatatan panen per blok lahan\n👷 Absensi & upah tenaga kerja kebun\n📦 Pelacakan stok gudang pupuk & pestisida\n📈 Laporan laba-rugi otomatis siap audit`,
      professional: `Agrotech ERP Cloud menyederhanakan kompleksitas rantai pasok dan operasional lapangan agribisnis. Memberikan akuntabilitas menyeluruh mulai dari penanaman, pemeliharaan, hingga kalkulasi Cost of Goods Sold (COGS) panen.`,
      innovative: `Tinggalkan era pembukuan konvensional! Digitalisasikan seluruh ekosistem perkebunan Anda dalam satu dashboard terintegrasi yang dapat diakses di mana saja, kapan saja. 💻⚡`,
      storytelling: `Dulu pusing rekap buku catatan basah terkena hujan di pos kebun, nota pembelian pupuk terselip, dan hitungan hasil panen sering selisih. Sekarang semua mandor input data lewat HP, malam hari laporan keuangan sudah tersaji rapi! 📊✨`
    },
    hashtags: '#ERPAgribisnis #ManajemenKebun #Agrotech #SoftwarePertanian #CloudSaaS #CatatanPanen #Agribusiness'
  },
  offline_sync: {
    title: 'Solusi Tanpa Sinyal (Offline-First Sync)',
    assetId: 'a9',
    format: 'feed',
    hooks: [
      'Sinyal hilang di pedalaman kebun? Agrotech tetap jalan lancar tanpa macet! 📶✨',
      'Tetap bisa dipakai tanpa internet: Solusi Offline-First untuk perkebunan terpencil! 🚜',
      'Data lapangan tetap aman tersimpan walau blank spot di tengah lembah! ⛰️📱',
      'Catat tonase panen di tengah perkebunan sawit tanpa khawatir data hilang! 🌴💾',
      'Auto-sync otomatis ke cloud begitu HP mendeteksi koneksi Wi-Fi atau 4G! 🔄⚡',
      'Aplikasi pertanian yang benar-benar paham kondisi infrastruktur pelosok Indonesia! 🇮🇩🙌'
    ],
    bodies: {
      educational: `Kami paham betul: mayoritas lahan perkebunan di Indonesia berada di area pelosok dengan koneksi internet terbatas atau blank spot total.\n\nFitur Offline-First Agrotech memungkinkan:\n📲 Input data panen & aktivitas kebun tanpa perlu sinyal internet\n💾 Penyimpanan lokal terenkripsi di perangkat HP\n🔄 Auto-Sync otomatis ke cloud begitu perangkat mendeteksi jaringan Wi-Fi/4G`,
      professional: `Dirancang khusus untuk realitas infrastruktur pedesaan dan remote area di Indonesia. Arsitektur offline-first menjamin business continuity dan integritas data operasional tanpa ketergantungan pada stabilitas jaringan seluler.`,
      innovative: `Teknologi yang memahami tantangan nyata lapangan! Agrotech hadir dengan arsitektur sinkronisasi cerdas yang membuat mandor kebun tetap produktif di mana pun titik koordinatnya berada. 📶🚀`,
      storytelling: `Sering kesal aplikasi macet gara-gara sinyal 'E' di ujung kebun? Agrotech dirancang agar Anda bisa tetap mencatat tonase panen di tengah perkebunan sawit atau hortikultura tanpa sinyal sama sekali! Begitu kembali ke kantor pos, semua data langsung terkirim otomatis! 🌾🙌`
    },
    hashtags: '#OfflineFirst #Agrotech #SolusiKebun #SinyalLemah #SmartFarming #InovasiTani #PertanianPelosok'
  },
  case_study: {
    title: 'Bukti Hasil Panen & Studi Kasus Nyata',
    assetId: 'a8',
    format: 'feed',
    hooks: [
      'Kisah Nyata: Panen hortikultura naik 28% setelah beralih ke Agrotech! 🏆🌾',
      'Dari rugi jutaan akibat pupuk boros, kini kebun ini jadi percontohan Smart Farming! 🌟',
      'Buktikan sendiri transformasi hasil kebun Anda bersama teknologi Agrotech! 🚜📈',
      'Petani cabai ini berhasil panen maksimal di tengah cuaca ekstrem berkat sensor IoT! 🌶️🌧️',
      'Investasi teknologi yang balik modal kurang dari 2 siklus tanam! Ini buktinya! 💵⏱️',
      'Bukan sekadar klaim, ribuan hektar perkebunan telah membuktikan efisiensinya! 🌾🚀'
    ],
    bodies: {
      educational: `Studi kasus di perkebunan mitra Agrotech membuktikan bahwa digitalisasi bukan biaya tambahan, melainkan investasi yang melipatgandakan keuntungan!\n\n📌 Hasil terukur dalam 1 musim tanam:\n📉 Penghematan air & pupuk: -32%\n📈 Peningkatan tonase hasil panen: +28%\n⏱️ Efisiensi waktu pengawasan: 3x lebih cepat\n\nSiap membawa kebun Anda ke level berikutnya?`,
      professional: `Analisis ROI implementasi solusi Agrotech pada portofolio mitra komoditas menunjukkan Payback Period rata-rata kurang dari 2 siklus tanam, didorong oleh efisiensi input kimiawi dan peningkatan mutu komoditas grade A.`,
      innovative: `Bukan sekadar klaim, ini bukti nyata di lapangan! Ribuan petani dan pengelola kebun modern telah merasakan langsung lompatan produktivitas bersama platform Agrotech. 🚀🌱`,
      storytelling: `Pak Joko sempat ragu memasang sensor dan aplikasi di kebun cabainya. 'Bisa apa alat kecil ini?'. Tapi saat cuaca ekstrem tiba, sensor memperingatkan potensi busuk akar sebelum gejala muncul. Hasilnya? Panen tahun ini adalah yang tertinggi dalam 5 tahun terakhir! 🌾🏆`
    },
    hashtags: '#KisahPetani #StudiKasusTani #HasilPanen #Agrotech #PetaniSukses #SmartFarming #TestimoniTani'
  },
  edu_5signs: {
    title: '5 Tanda Kebun Butuh Sentuhan IoT',
    assetId: 'a6',
    format: 'feed',
    hooks: [
      '5 Tanda Kebun Anda Butuh Sentuhan Teknologi Smart Farming! ⚠️🚜',
      'Apakah kebunmu mengalami 3 dari 5 masalah klasik ini? Simak solusinya! 🧐',
      'Checklist Petani Modern: Seberapa siap kebunmu menghadapi musim baru? 📋🌱',
      'Tanaman sering gagal panen tanpa tahu penyebab pastinya? Cek tanda-tanda ini! 🔍🥀',
      'Biaya pupuk membengkak tapi hasil panen stagnan? Ini 5 tanda kebun butuh audit! 💡🌾',
      '3 Inefisiensi terbesar yang sering tidak disadari oleh pemilik kebun modern! 🚨📊'
    ],
    bodies: {
      educational: `Coba cek apakah kebunmu sedang mengalami kondisi ini:\n\n1️⃣ Biaya pupuk terus meroket tapi hasil panen stagnan\n2️⃣ Jadwal penyiraman masih kira-kira pakai cuaca\n3️⃣ Hama baru terdeteksi setelah menyebar parah\n4️⃣ Rekap data panen masih tercecer di kertas nota\n5️⃣ Sulit memantau kebun saat bepergian ke luar kota\n\nJika ada 2 atau lebih tanda di atas, sudah saatnya kebunmu bertransformasi bersama Agrotech! 🌾💡`,
      professional: `Audit operasional sederhana dapat mengidentifikasi inefisiensi laten pada perkebunan. Dari ketidaktepatan dosis nutrisi hingga keterlambatan mitigasi agronomis, Agrotech menyediakan platform modular untuk mentransformasi kebun Anda menuju operasional berstandar industri.`,
      innovative: `Jangan tunggu sampai merugi baru berbenah! Dunia pertanian telah berevolusi, dan kebun Anda berhak mendapatkan teknologi terbaik untuk bersaing di era digital. 🚀🌾`,
      storytelling: `Dulu kami pikir masalah kebun itu biasa: panen naik turun, pupuk boros, daun tiba-tiba kuning. Sampai akhirnya sadar, itu semua bisa dicegah jika kita punya data yang akurat! Simak 5 tanda kebun Anda butuh upgrade digital sekarang! 🚜✨`
    },
    hashtags: '#TipsPertanian #EdukasiKebun #5TandaKebun #Agrotech #SmartFarming #PetaniIndonesia #SolusiTani'
  }
};

// ALIAS MAPPING PILAR SESUAI TEMA KONSULTAN TERANG BULAN
AI_CONTENT_DATABASE.yield_optimization = AI_CONTENT_DATABASE.iot_sensor;
AI_CONTENT_DATABASE.early_detection = AI_CONTENT_DATABASE.edu_5signs;
AI_CONTENT_DATABASE.smart_fertigation = AI_CONTENT_DATABASE.fertigation;
AI_CONTENT_DATABASE.drone_spatial_audit = AI_CONTENT_DATABASE.ndvi_satellite;
AI_CONTENT_DATABASE.cost_leakage_erp = AI_CONTENT_DATABASE.erp_cloud;
AI_CONTENT_DATABASE.grade_a_formula = AI_CONTENT_DATABASE.case_study;

const CTA_OPTIONS = {
  wa: '👉 Hubungi WhatsApp konsultan kami: Amanda (0857-1385-0615) / Hardadi (0813-1307-8216) atau klik link di bio @cvagrotechnology!',
  bio: '🔗 Pelajari fitur lengkap & dapatkan promo spesial di website resmi kami: klik link di bio @cvagrotechnology!',
  demo: '🚜 Mau coba demo langsung di kebunmu? Hubungi WhatsApp Amanda (0857-1385-0615) atau Hardadi (0813-1307-8216) untuk penjadwalan demo gratis!',
  comment: '💬 Tuliskan tantangan terbesar di kebunmu saat ini di kolom komentar, mari berdiskusi bersama!'
};

function onPillarSelectChange() {
  const pillarVal = document.getElementById('genPillar')?.value;
  const customGroup = document.getElementById('customTopicGroup');
  if (customGroup) {
    customGroup.style.display = (pillarVal === 'custom') ? 'block' : 'none';
  }

  const PILLAR_TO_THEME = {
    yield_optimization: 0,
    early_detection: 1,
    smart_fertigation: 2,
    drone_spatial_audit: 3,
    cost_leakage_erp: 4,
    grade_a_formula: 5,
    // legacy fallbacks
    iot_sensor: 0,
    edu_5signs: 1,
    fertigation: 2,
    ndvi_satellite: 3,
    erp_cloud: 4,
    case_study: 5
  };

  if (pillarVal in PILLAR_TO_THEME) {
    selectThemeStyle(PILLAR_TO_THEME[pillarVal]);
  }
}

function selectGenAsset(assetId, element) {
  selectedGenAssetId = assetId;
  const picker = document.getElementById('genAssetPicker');
  if (picker) {
    picker.querySelectorAll('.asset-thumb').forEach(el => {
      el.classList.remove('selected');
      if (el.getAttribute('data-asset') === assetId) {
        el.classList.add('selected');
      }
    });
  }

  const asset = DEFAULT_ASSETS.find(a => a.id === assetId);
  if (asset) {
    if (generatedVariations && generatedVariations.length > 0) {
      generatedVariations[0].localMedia = asset.path;
      generatedVariations[0].mediaUrl = asset.onlineUrl || asset.path;
      generatedVariations[0].assetName = `📸 ${asset.name}`;
      renderGenResults();
      showToast(`📸 Gambar Rekomendasi #1 langsung diganti ke: ${asset.name}!`);
    } else {
      showToast(`📸 Foto terpilih: ${asset.name}. Klik "Generate" untuk memuat.`);
    }
  }
}

let currentVisualGenMode = 'banner'; // DEFAULT TO 'banner' (Canvas Synthesized Poster Graphic)

function setVisualGenMode(mode) {
  currentVisualGenMode = mode;
  const btnAuto = document.getElementById('btnVisualModeAuto');
  const btnBanner = document.getElementById('btnVisualModeBanner');

  if (mode === 'auto') {
    if (btnAuto) {
      btnAuto.style.border = '2px solid #10B981';
      btnAuto.style.background = 'rgba(16,185,129,0.15)';
      const d = btnAuto.querySelector('div');
      if (d) d.style.color = '#10B981';
    }
    if (btnBanner) {
      btnBanner.style.border = '1px solid var(--dark-border)';
      btnBanner.style.background = 'var(--dark-surface)';
      const d = btnBanner.querySelector('div');
      if (d) d.style.color = 'var(--text-muted)';
    }
    showToast('📸 Mode Visual: Foto Visual Nyata 8K aktif!');
  } else {
    if (btnBanner) {
      btnBanner.style.border = '2px solid #F59E0B';
      btnBanner.style.background = 'rgba(245,158,11,0.15)';
      const d = btnBanner.querySelector('div');
      if (d) d.style.color = '#F59E0B';
    }
    if (btnAuto) {
      btnAuto.style.border = '1px solid var(--dark-border)';
      btnAuto.style.background = 'var(--dark-surface)';
      const d = btnAuto.querySelector('div');
      if (d) d.style.color = 'var(--text-muted)';
    }
    showToast('🎨 Mode Visual: Banner Teks Tipografi aktif!');
  }

  // Langsung terapkan perubahan gambar seketika
  triggerAiGeneration();
}

let selectedThemeStyleIdx = 0;
function selectThemeStyle(idx) {
  selectedThemeStyleIdx = idx;
  const colors = ['#EAB308', '#10B981', '#38BDF8', '#0284C7', '#F59E0B', '#22C55E'];
  for (let i = 0; i < 6; i++) {
    const pill = document.getElementById(`stylePill${i}`);
    if (pill) {
      if (i === idx) {
        pill.classList.add('active');
        pill.style.border = `1.5px solid ${colors[i]}`;
        pill.style.background = `${colors[i]}25`;
      } else {
        pill.classList.remove('active');
        pill.style.border = '1px solid var(--dark-border)';
        pill.style.background = 'var(--dark-surface)';
      }
    }
  }
  const theme = CONSULTING_THEMES[idx % CONSULTING_THEMES.length];
  showToast(`🎨 Gaya Infografis Terang Bulan: "${theme.ribbonText}" dipilih!`);
  generateNewAiImageOnly();
}

// FUNGSI KHUSUS GENERATE GAMBAR POSTER BARU (100% SINTESIS AI, BUKAN DARI STOK)
function generateNewAiImageOnly() {
  const pillarKey = document.getElementById('genPillar')?.value || 'yield_optimization';
  const customTopic = document.getElementById('genCustomTopic')?.value?.trim();
  const theme = CONSULTING_THEMES[selectedThemeStyleIdx % CONSULTING_THEMES.length];

  const activeHook = customTopic ? customTopic.toUpperCase() : theme.headline;

  // Buat poster banner baru 1080x1080 beresolusi tinggi secara visual
  const newBannerDataUrl = createSynthesizedBanner(activeHook, '', selectedThemeStyleIdx, pillarKey);
  window.lastGeneratedCustomImage = newBannerDataUrl;

  // Tampilkan langsung di wadah pratinjau studio
  const previewImg = document.getElementById('liveGeneratedImagePreview');
  const placeholder = document.getElementById('liveImagePlaceholder');
  if (previewImg) {
    previewImg.src = newBannerDataUrl;
    previewImg.style.display = 'block';
  }
  if (placeholder) {
    placeholder.style.display = 'none';
  }

  // Update badge status
  const badge = document.getElementById('activePosterStyleBadge');
  if (badge) {
    badge.innerText = `✨ ${theme.ribbonText}`;
    badge.style.background = '#10B981';
    badge.style.color = '#041008';
  }

  // Jika kartu hasil variasi sudah pernah di-generate, perbarui kartu pertama seketika
  if (typeof generatedVariations !== 'undefined' && generatedVariations && generatedVariations.length > 0) {
    generatedVariations[0].localMedia = newBannerDataUrl;
    generatedVariations[0].mediaUrl = newBannerDataUrl;
    generatedVariations[0].assetName = `✨ ${theme.ribbonText}`;
    generatedVariations[0].caption = buildConsultingCaption(theme);
    renderGenResults();
  }

  showToast(`✨ Poster Infografis Terang Bulan: "${theme.ribbonText}" siap!`);
}

// PRELOADED ASSETS FOR HIGH-IMPACT CONSULTING POSTER (TERANG BULAN CONSULTING STYLE)
const CONSULTING_HERO_ASSETS = [
  'assets/ig_soil_probe_iot.jpg',
  'assets/ig_aerial_ndvi_farm.jpg',
  'assets/ig_harvest_success.jpg',
  'assets/ig_agronomist_lab.jpg',
  'assets/ig_greenhouse_iot.jpg',
  'assets/ig_smart_tractor.jpg',
  'assets/ig_drone_multispectral.jpg',
  'assets/ig_edu_precision_fertigation.jpg'
];

const PRELOADED_CONSULTING_IMGS = [];
if (typeof Image !== 'undefined') {
  CONSULTING_HERO_ASSETS.forEach(src => {
    const img = new Image();
    img.src = src;
    PRELOADED_CONSULTING_IMGS.push(img);
  });
}

function drawRoundRectPath(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

function drawHighlightedHeadline(ctx, text, x, y, accentColor) {
  const words = text.split(' ');
  let curX = x;
  words.forEach((w, idx) => {
    if (idx < 2 || /\d/.test(w) || /3x|35%|99%|100%|iot|erp|ndvi|smart/i.test(w)) {
      ctx.fillStyle = accentColor;
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText(w, curX, y);
    curX += ctx.measureText(w + ' ').width;
  });
}

function wrapTextLines(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}

// DAFTAR TEMA INFOGRAFIS EDITORIAL KONSULTAN AGRIBISNIS TERANG BULAN CONSULTING (@terangbulan.consulting)
const CONSULTING_THEMES = [
  {
    ribbonText: 'LAHAN SAMA, HASIL HARUS BERBEDA',
    headline: 'Mengapa Produktivitas Kebun Harus Naik, Bukan Sekadar Luas Lahan?',
    c1Title: 'EFISIENSI LEBIH PENTING',
    c1Desc: 'Maksimalkan potensi hasil dari lahan yang sudah ada sebelum membuka atau menambah areal baru.',
    c2Title: 'PRODUKTIVITAS = KUNCI PROFIT',
    c2Desc: 'Hasil per hektare yang lebih tinggi membantu meningkatkan efisiensi biaya dan keuntungan usaha.',
    c3Title: 'DATA MENENTUKAN KEPUTUSAN',
    c3Desc: 'Monitoring produksi, kondisi tanah, pemupukan, air, dan kesehatan tanaman temukan masalah lebih tepat.',
    c4Title: 'MANAJEMEN KEBUN NAIK KELAS',
    c4Desc: 'Perawatan tepat, SOP konsisten, teknologi cerdas, dan evaluasi rutin bikin lahan hasilkan panen optimal.',
    quote1: 'Bukan soal punya lahan lebih luas.',
    quote2: 'Tapi bagaimana membuat setiap hektare menghasilkan lebih optimal.',
    heroIdx: 1 // ig_aerial_ndvi_farm.jpg (kebun perbukitan persis seperti foto TBS)
  },
  {
    ribbonText: 'ERA BARU PERKEBUNAN CERDAS',
    headline: '5 Tanda Kebun Anda Mendesak Butuh Sentuhan Teknologi & IoT',
    c1Title: 'BIAYA PUPUK MEMBENGKAK',
    c1Desc: 'Dosis pupuk tanpa takaran sensor menguras biaya operasional tanpa diiringi kenaikan tonase.',
    c2Title: 'KONDISI TANAH TIDAK TERPANTAU',
    c2Desc: 'pH tanah dan kelembaban yang drop memicu stres akar dan tanaman mudah layu terserang hama.',
    c3Title: 'TELAT DETEKSI SERANGAN HAMA',
    c3Desc: 'Citra drone spasial NDVI mendeteksi anomali klorofil daun sebelum bercak penyakit menular.',
    c4Title: 'PEMBUKUAN KEBUN MASIH MANUAL',
    c4Desc: 'Catatan basah dan nota hilang di pos kebun digantikan rekapitulasi data cloud otomatis di HP.',
    quote1: 'Teknologi bukan sekadar biaya,',
    quote2: 'melainkan investasi untuk memangkas pemborosan kebun hingga 35%.',
    heroIdx: 0 // ig_soil_probe_iot.jpg
  },
  {
    ribbonText: 'NUTRISI TEPAT SASARAN',
    headline: 'Rahasia Nutrisi Efisien: Solusi Smart Fertigation Tanpa Terbuang',
    c1Title: 'HEMAT AIR HINGGA 50%',
    c1Desc: 'Katup solenoid otomatis membuka sesuai kebutuhan lengas tanah riil per blok perkebunan.',
    c2Title: 'PENYERAPAN HARA MAKSIMAL',
    c2Desc: 'Pupuk cair terlarut dialirkan langsung ke zona perakaran aktif tanpa menguap sia-sia.',
    c3Title: 'PERTUMBUHAN SERAGAM',
    c3Desc: 'Setiap pohon menerima takaran nutrisi yang sama presisi, panen buah grade A seragam merata.',
    c4Title: 'EFISIENSI BIAYA OPERASIONAL',
    c4Desc: 'Pengontrolan fertigasi puluhan hektar cukup dijalankan 1 operator dari aplikasi HP Agrotech.',
    quote1: 'Pupuk berkualitas akan sia-sia',
    quote2: 'jika cara aplikasi dan distribusinya ke perakaran tanaman tidak presisi.',
    heroIdx: 4 // ig_greenhouse_iot.jpg
  },
  {
    ribbonText: 'AUDIT KEBUN BERBASIS DATA',
    headline: 'Pantau Kesehatan 50 Hektar Kebun Cukup 10 Menit Dari Udara',
    c1Title: 'PEMETAAN INDEKS NDVI HD',
    c1Desc: 'Kamera multispektral membaca tingkat klorofil daun dan stres tanaman secara akurat per pohon.',
    c2Title: 'SENSUS POHON DIGITAL',
    c2Desc: 'AI menghitung populasi tegakan pohon produktif dan titik pohon mati otomatis tanpa manual.',
    c3Title: 'ZONASI PEMUPUKAN MIKRO',
    c3Desc: 'Pupuk hanya disebar pada blok yang kekurangan hara, mencegah pemborosan di blok subur.',
    c4Title: 'HISTORIS DIGITAL KEBUN',
    c4Desc: 'Rekam jejak visual perkebunan tersimpan rapi untuk kebutuhan valuasi dan laporan investor.',
    quote1: 'Keputusan agribisnis terbaik',
    quote2: 'dilahirkan dari data lapangan yang presisi, bukan sekadar firasat.',
    heroIdx: 6 // ig_drone_multispectral.jpg
  },
  {
    ribbonText: 'MANAJEMEN KAS PROFESIONAL',
    headline: 'Pangkas Kebocoran Biaya Kebun: Dari Mandor Langsung ke Pemilik',
    c1Title: 'KONTROL STOK GUDANG KEBUN',
    c1Desc: 'Penerimaan dan pemakaian pupuk, herbisida, dan solar tercatat transparan per transaksi.',
    c2Title: 'UPAH PEKERJA TERUKUR',
    c2Desc: 'Absensi digital mandor dan borongan panen terhitung otomatis tanpa risiko selisih hitungan.',
    c3Title: 'TIMBANGAN PANEN LIVE',
    c3Desc: 'Tonase panen yang ditimbang di pos kebun langsung terhubung ke dashboard pemilik secara real-time.',
    c4Title: 'ANALISIS HPP PER KILOGRAM',
    c4Desc: 'Ketahui persis biaya pokok produksi per kg untuk menentukan margin keuntungan bersih usaha.',
    quote1: 'Kebun yang sukses dan menguntungkan',
    quote2: 'adalah kebun yang setiap rupiah biaya dan hasil panennya terdata rapi.',
    heroIdx: 5 // ig_smart_tractor.jpg
  },
  {
    ribbonText: 'FORMULA HASIL MAKSIMAL',
    headline: 'Strategi Petani Modern Dongkrak Tonase Panen Hingga 28%',
    c1Title: 'PERBAIKAN STRUKTUR TANAH',
    c1Desc: 'Aplikasi mikroorganisme dan pembenah tanah mengembalikan kesuburan dan aerasi tanah.',
    c2Title: 'FORMULA SPESIFIK FASE',
    c2Desc: 'Takaran unsur hara makro NPK dan mikro disesuaikan kebutuhan spesifik fase vegetatif & generatif.',
    c3Title: 'PENDAMPINGAN LAPANGAN',
    c3Desc: 'Konsultasi berkala bersama tim agronomis Agrotech mendeteksi dini kendala budidaya di kebun.',
    c4Title: 'STANDAR PASAR PREMIUM',
    c4Desc: 'Keseragaman ukuran, bobot, dan kematangan hasil panen memenuhi kualifikasi harga industri tinggi.',
    quote1: 'Hasil panen melimpah bukan kebetulan,',
    quote2: 'tetapi buah dari penerapan SOP budidaya yang konsisten dan terukur.',
    heroIdx: 2 // ig_harvest_success.jpg
  }
];

function buildConsultingCaption(t) {
  return `${t.ribbonText}.

${t.headline}

Apakah meningkatkan produktivitas kebun harus selalu dengan menambah luas lahan? Belum tentu.
Justru, tantangan agribisnis dan perkebunan modern adalah bagaimana membuat setiap hektare menghasilkan lebih optimal dan terukur.

📌 Mengapa hal ini krusial bagi perkebunan Anda?

1️⃣ ${t.c1Title}
${t.c1Desc}

2️⃣ ${t.c2Title}
${t.c2Desc}

3️⃣ ${t.c3Title}
${t.c3Desc}

4️⃣ ${t.c4Title}
${t.c4Desc}

💡 "${t.quote1} ${t.quote2}"

🔖 Simpan insight ini untuk evaluasi kebun Anda!
Konsultasikan kebutuhan teknologi sensor IoT, drone NDVI, dan modernisasi perkebunan Anda bersama CV Agroteknologi Nusantara:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#SmartFarming #Agrotech #ManajemenKebun #AgribisnisIndonesia #PertanianModern #KonsultanPerkebunan #IoTPertanian #cvagrotechnology`;
}

// SEED 6 POSTINGAN DEFAULT DENGAN FORMAT TERANG BULAN CONSULTING
INITIAL_POSTS.push(
  {
    id: 'post-tb-1',
    topic: 'LAHAN SAMA, HASIL HARUS BERBEDA',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_aerial_ndvi_farm.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[0]),
    date: '2026-10-23',
    time: '08:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-2',
    topic: 'ERA BARU PERKEBUNAN CERDAS',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_soil_probe_iot.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[1]),
    date: '2026-10-25',
    time: '10:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-3',
    topic: 'NUTRISI TEPAT SASARAN',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_greenhouse_iot.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[2]),
    date: '2026-10-27',
    time: '14:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-4',
    topic: 'AUDIT KEBUN BERBASIS DATA',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_drone_multispectral.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[3]),
    date: '2026-10-29',
    time: '09:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-5',
    topic: 'MANAJEMEN KAS PROFESIONAL',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_smart_tractor.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[4]),
    date: '2026-10-31',
    time: '16:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-6',
    topic: 'FORMULA HASIL MAKSIMAL',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_harvest_success.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[5]),
    date: '2026-11-02',
    time: '11:00',
    status: 'scheduled'
  }
);

// CANVAS BANNER SYNTHESIZER: PERSIS MODEL KONTEN KONSULTAN AGRIBISNIS TERANG BULAN CONSULTING (@terangbulan.consulting)
function createSynthesizedBanner(hookTitle, subtitle, themeIndex, pillarKey) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  const t = CONSULTING_THEMES[themeIndex % CONSULTING_THEMES.length];

  // 1. BASE CANVAS: CLEAN CRISP WHITE / LIGHT BG (SESUAI CONTOH TERANG BULAN CONSULTING)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1080, 1080);

  // Bagian bawah kartu diberi nuansa abu-abu sangat lembut untuk kontras
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 440, 1080, 640);

  // 2. TOP HERO PHOTO SECTION (y = 0 to 450)
  const heroH = 450;
  const photo = PRELOADED_CONSULTING_IMGS[t.heroIdx % PRELOADED_CONSULTING_IMGS.length];
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    // Fallback gradient pemandangan perkebunan hijau
    const pGrad = ctx.createLinearGradient(0, 0, 1080, heroH);
    pGrad.addColorStop(0, '#1E3A2F');
    pGrad.addColorStop(0.5, '#2D5A43');
    pGrad.addColorStop(1, '#4A7C59');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, 0, 1080, heroH);
  }

  // Gradient Soft Light Mask di sisi kiri foto agar teks headline terbaca kontras & tajam
  const leftScrim = ctx.createLinearGradient(0, 0, 680, 0);
  leftScrim.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
  leftScrim.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
  leftScrim.addColorStop(0.8, 'rgba(255, 255, 255, 0.35)');
  leftScrim.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = leftScrim;
  ctx.fillRect(0, 0, 680, heroH);

  // Gradient Fade di bagian bawah foto (menyatu mulus ke area putih kartu di bawahnya)
  const bottomScrim = ctx.createLinearGradient(0, heroH - 90, 0, heroH);
  bottomScrim.addColorStop(0, 'rgba(255, 255, 255, 0)');
  bottomScrim.addColorStop(1, 'rgba(248, 250, 252, 1)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, heroH - 90, 1080, 90);

  // Elemen Holografik Cerdas di Sisi Kanan Foto (Mewakili teknologi agronomis tablet di foto TBS)
  ctx.fillStyle = 'rgba(15, 35, 60, 0.65)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  drawRoundRectPath(ctx, 810, 140, 220, 160, 14);
  ctx.fill();
  ctx.stroke();

  // Mini Bar Chart Hologram
  ctx.fillStyle = '#10B981';
  ctx.fillRect(835, 240, 18, 40);
  ctx.fillRect(865, 220, 18, 60);
  ctx.fillRect(895, 200, 18, 80);
  ctx.fillRect(925, 180, 18, 100);
  ctx.fillRect(955, 160, 18, 120);

  // Line Chart overlay
  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(844, 235);
  ctx.lineTo(874, 215);
  ctx.lineTo(904, 195);
  ctx.lineTo(934, 175);
  ctx.lineTo(964, 155);
  ctx.stroke();

  // Mini label hologram
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('📈 LIVE TELEMETRI KEBUN', 835, 158);

  // 3. LOGO RESMI AGROTECH DI POJOK KANAN ATAS (PERSIS LOGO TBS)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundRectPath(ctx, 830, 26, 210, 58, 12);
  ctx.fill();
  ctx.stroke();

  // Logo Box
  ctx.fillStyle = '#0F2B4E';
  drawRoundRectPath(ctx, 842, 34, 46, 42, 8);
  ctx.fill();

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('AG', 850, 62);

  ctx.fillStyle = '#0F2B4E';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AGROTECH', 898, 52);

  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.fillText('SMART AGRIBISNIS', 898, 68);

  // 4. PITA KUNING BRUSH DI KIRI ATAS (PERSIS "LAHAN SAMA, HASIL HARUS BERBEDA" DI POSTINGAN TBS)
  ctx.fillStyle = '#EAB308'; // Mustard Gold TBS
  drawRoundRectPath(ctx, 45, 30, 480, 58, 8);
  ctx.fill();

  // Aksen garis dekoratif pita
  ctx.fillStyle = '#CA8A04';
  ctx.fillRect(45, 84, 480, 4);

  ctx.fillStyle = '#0A2342'; // Dark Navy
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(t.ribbonText, 65, 67);

  // 5. HEADLINE UTAMA BERTEMA KONSULTAN (Bukan sekadar teks biasa)
  // Font tegas, navy gelap, kontras di atas foto
  ctx.fillStyle = '#0A2342';
  ctx.font = 'bold 36px sans-serif';
  wrapTextLines(ctx, t.headline, 55, 138, 540, 46);

  // 6. AREA 4 KARTU INFOGRAFIS (GRID 2x2 PERSIS POSTINGAN TBS: 01, 02, 03, 04)
  const cardW = 475;
  const cardH = 165;
  const cardRadius = 14;

  const cardData = [
    { num: '01', title: t.c1Title, desc: t.c1Desc, x: 45, y: 465, color: '#059669', icon: '🌱' },
    { num: '02', title: t.c2Title, desc: t.c2Desc, x: 560, y: 465, color: '#0284C7', icon: '📈' },
    { num: '03', title: t.c3Title, desc: t.c3Desc, x: 45, y: 645, color: '#0369A1', icon: '📋' },
    { num: '04', title: t.c4Title, desc: t.c4Desc, x: 560, y: 645, color: '#16A34A', icon: '⚙️' }
  ];

  cardData.forEach(c => {
    // Background Kartu Putih Bersih
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    drawRoundRectPath(ctx, c.x, c.y, cardW, cardH, cardRadius);
    ctx.fill();
    ctx.stroke();

    // Lingkaran Ikon Berwarna di Kiri (Persis Ikon Hijau/Biru TBS)
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x + 48, c.y + 48, 26, 0, Math.PI * 2);
    ctx.fill();

    // Ikon Grafis
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px sans-serif';
    ctx.fillText(c.icon, c.x + 37, c.y + 56);

    // Nomor Poin
    ctx.fillStyle = c.color;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(c.num, c.x + 88, c.y + 44);

    // Judul Poin (Huruf Besar Navy Bold)
    ctx.fillStyle = '#0A2342';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(c.title, c.x + 128, c.y + 44);

    // Penjelasan Poin (Teks Abu-abu Gelap Rapi 3 baris)
    ctx.fillStyle = '#334155';
    ctx.font = '14.5px sans-serif';
    wrapTextLines(ctx, c.desc, c.x + 88, c.y + 74, 365, 23);
  });

  // 7. BANNER QUOTE BIRU NAVY DI KIRI BAWAH (PERSIS BANNER BIRU TBS DENGAN LAMPU BOHLAM KUNING)
  const quoteX = 45;
  const quoteY = 828;
  const quoteW = 635;
  const quoteH = 92;

  ctx.fillStyle = '#0A2540'; // Deep Navy TBS
  drawRoundRectPath(ctx, quoteX, quoteY, quoteW, quoteH, 16);
  ctx.fill();

  // Lingkaran Bohlam Kuning di Kiri
  ctx.fillStyle = '#EAB308';
  ctx.beginPath();
  ctx.arc(quoteX + 46, quoteY + 46, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0A2540';
  ctx.font = '24px sans-serif';
  ctx.fillText('💡', quoteX + 34, quoteY + 54);

  // Teks Quote 2 Baris (Baris 1 Putih, Baris 2 Kuning Terang)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(t.quote1, quoteX + 86, quoteY + 38);

  ctx.fillStyle = '#FCD34D'; // Kuning Terang
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(t.quote2, quoteX + 86, quoteY + 68);

  // 8. KOTAK BOOKMARK "SAVE →" DI KANAN BAWAH (PERSIS TOMBOL SAVE TBS)
  const saveX = 698;
  const saveY = 828;
  const saveW = 337;
  const saveH = 92;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  drawRoundRectPath(ctx, saveX, saveY, saveW, saveH, 16);
  ctx.fill();
  ctx.stroke();

  // Ikon Bookmark Kuning
  ctx.fillStyle = '#EAB308';
  ctx.font = '32px sans-serif';
  ctx.fillText('🔖', saveX + 20, saveY + 58);

  // Tulisan SAVE ->
  ctx.fillStyle = '#0A2540';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('SAVE →', saveX + 70, saveY + 44);

  // Subteks Simpan Insight
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Simpan insight ini untuk', saveX + 70, saveY + 66);
  ctx.fillText('evaluasi kebun Anda.', saveX + 70, saveY + 82);

  // 9. FOOTER BAR ELEGAN DI BAGIAN PALING BAWAH (PERSIS FOOTER TERANG BULAN)
  const footerY = 938;
  const footerH = 142;

  // Background Royal Navy Gelap
  const footGrad = ctx.createLinearGradient(0, footerY, 1080, footerY);
  footGrad.addColorStop(0, '#06182C');
  footGrad.addColorStop(1, '#0B284A');
  ctx.fillStyle = footGrad;
  ctx.fillRect(0, footerY, 1080, footerH);

  // Garis aksen emas di atas footer
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(0, footerY, 1080, 4);

  // Aksen Daun Hijau di Pojok Kiri Bawah (Dekoratif Perkebunan)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.beginPath();
  ctx.arc(30, 1070, 70, 0, Math.PI * 2);
  ctx.fill();

  // Baris 1 Footer: Identitas Akun & Website
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('📷 @cvagrotechnology', 65, footerY + 50);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '20px sans-serif';
  ctx.fillText('|   🌐 www.cvagrotechnology.com', 335, footerY + 50);

  // Baris 2 Footer: Kontak WhatsApp Resmi Amanda & Hardadi
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('📲 Konsultasi & Demo: Amanda (0857-1385-0615)  |  Hardadi (0813-1307-8216)', 65, footerY + 95);

  return canvas.toDataURL('image/jpeg', 0.94);
}

let genCycleCount = 0;
let lastUsedAssetIds = [];
let lastUsedHookIds = [];

function triggerAiGeneration() {
  genCycleCount++;

  const pillarKey = document.getElementById('genPillar')?.value || 'iot_sensor';
  const customTopic = document.getElementById('genCustomTopic')?.value?.trim();
  const tone = document.getElementById('genTone')?.value || 'educational';
  const format = document.getElementById('genFormat')?.value || 'feed';
  const ctaKey = document.getElementById('genCta')?.value || 'wa';

  const ctaText = CTA_OPTIONS[ctaKey] || CTA_OPTIONS['wa'];

  // Smart Visual Pools per Pillar (Memiliki 9-10 aset 8K per pilar)
  const pillarVisualPools = {
    iot_sensor: ['a10', 'a6', 'a9', 'a3', 'a8', 'a11', 'a7', 'a12', 'a4', 'a2'],
    ndvi_satellite: ['a12', 'a7', 'a4', 'a9', 'a6', 'a10', 'a8', 'a11', 'a3'],
    fertigation: ['a3', 'a10', 'a8', 'a6', 'a9', 'a11', 'a12', 'a7', 'a4'],
    erp_cloud: ['a11', 'a9', 'a6', 'a8', 'a10', 'a12', 'a7', 'a3', 'a2'],
    offline_sync: ['a9', 'a10', 'a7', 'a6', 'a11', 'a12', 'a8', 'a3', 'a1'],
    case_study: ['a8', 'a11', 'a12', 'a9', 'a6', 'a10', 'a7', 'a3', 'a4'],
    edu_5signs: ['a6', 'a10', 'a7', 'a11', 'a9', 'a8', 'a12', 'a3', 'a2'],
    custom: ['a9', 'a10', 'a11', 'a12', 'a6', 'a7', 'a8', 'a3', 'a4', 'a2']
  };

  const pool = pillarVisualPools[pillarKey] || DEFAULT_ASSETS.map(a => a.id);

  // Pastikan 3 gambar di generate baru BERBEDA dari generate sebelumnya
  let candidates = pool.filter(id => !lastUsedAssetIds.includes(id));
  if (candidates.length < 3) candidates = [...pool];

  // Random shuffle candidates menggunakan Fisher-Yates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let selectedAssetIds;
  if (selectedGenAssetId) {
    const remaining = candidates.filter(id => id !== selectedGenAssetId);
    selectedAssetIds = [selectedGenAssetId, ...remaining.slice(0, 2)];
  } else {
    selectedAssetIds = candidates.slice(0, 3);
  }
  lastUsedAssetIds = selectedAssetIds; // simpan riwayat agar tidak sama di klik berikutnya

  const asset1 = DEFAULT_ASSETS.find(a => a.id === selectedAssetIds[0]) || DEFAULT_ASSETS[0];
  const asset2 = DEFAULT_ASSETS.find(a => a.id === selectedAssetIds[1]) || DEFAULT_ASSETS[1];
  const asset3 = DEFAULT_ASSETS.find(a => a.id === selectedAssetIds[2]) || DEFAULT_ASSETS[2];

  let baseContent = AI_CONTENT_DATABASE[pillarKey];
  if (!baseContent || pillarKey === 'custom') {
    const customTitle = customTopic || 'Inovasi Smart Farming Agrotech';
    baseContent = {
      title: customTitle,
      format: format,
      hooks: [
        `${customTitle} — Saatnya kebun Anda naik kelas! 🚜✨`,
        `Rahasia efisiensi dan hasil panen melimpah bersama ${customTitle}! 📊`,
        `Kabar baik untuk seluruh petani modern: ${customTitle}! 🌾🚀`,
        `Sudahkah kebun Anda menerapkan sistem cerdas ${customTitle}? 💡`,
        `Pangkas pemborosan dan lipatgandakan hasil kebun lewat ${customTitle}! 📈`,
        `Teknologi terdepan untuk perkebunan modern Indonesia: ${customTitle}! 🇮🇩⚡`
      ],
      bodies: {
        [tone]: `Tingkatkan hasil kebun dan maksimalkan efisiensi input pertanian Anda bersama solusi terdepan dari **Agrotech**!\n\nDidukung teknologi cloud modern, sensor presisi, dan antarmuka ramah pengguna, Agrotech membantu petani dan korporasi agribisnis mencapai produktivitas maksimal dengan biaya terukur. 🌱⚡`
      },
      hashtags: '#SmartFarming #Agrotech #PetaniModern #TeknologiPertanian #AgribisnisIndonesia #Pertanian40'
    };
  }

  // 2. PILIH 3 HOOK BARU & BERBEDA DI SETIAP KALI GENERATE
  const allHooks = [...(baseContent.hooks || [])];
  let hookCandidates = allHooks.filter(h => !lastUsedHookIds.includes(h));
  if (hookCandidates.length < 3) hookCandidates = [...allHooks];

  // Acak hook
  for (let i = hookCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hookCandidates[i], hookCandidates[j]] = [hookCandidates[j], hookCandidates[i]];
  }

  const hook1 = hookCandidates[0];
  const hook2 = hookCandidates[1];
  const hook3 = hookCandidates[2];
  lastUsedHookIds = [hook1, hook2, hook3]; // simpan riwayat hook

  const chosenBody = baseContent.bodies[tone] || baseContent.bodies['educational'] || Object.values(baseContent.bodies)[0];

  // Modulasi variasi isi teks agar tiap kartu punya sudut pandang unik
  const variation1Body = chosenBody;
  const variation2Body = baseContent.bodies['storytelling'] || chosenBody;
  const variation3Body = baseContent.bodies['innovative'] || baseContent.bodies['professional'] || chosenBody;

  // Tentukan visual untuk setiap variasi: 100% POSTER GRAFIS SINTESIS FRESH (BUKAN DARI STOK)
  let media1, media2, media3;
  let mediaUrl1, mediaUrl2, mediaUrl3;
  let assetName1, assetName2, assetName3;

  const themeA = selectedThemeStyleIdx;
  const themeB = (selectedThemeStyleIdx + 1) % 6;
  const themeC = (selectedThemeStyleIdx + 2) % 6;

  // Jika pengguna sudah klik tombol khusus generate poster, pakai gambar tersebut untuk variasi #1
  media1 = window.lastGeneratedCustomImage || createSynthesizedBanner(hook1, '', themeA, pillarKey);
  media2 = createSynthesizedBanner(hook2, '', themeB, pillarKey);
  media3 = createSynthesizedBanner(hook3, '', themeC, pillarKey);

  mediaUrl1 = media1;
  mediaUrl2 = media2;
  mediaUrl3 = media3;

  assetName1 = `✨ Poster AI Fresh (Tema #${themeA + 1})`;
  assetName2 = `✨ Poster AI Fresh (Tema #${themeB + 1})`;
  assetName3 = `✨ Poster AI Fresh (Tema #${themeC + 1})`;

  // Update wadah live preview gambar di atas seketika
  const livePreviewImg = document.getElementById('liveGeneratedImagePreview');
  const livePlaceholder = document.getElementById('liveImagePlaceholder');
  if (livePreviewImg) {
    livePreviewImg.src = media1;
    livePreviewImg.style.display = 'block';
  }
  if (livePlaceholder) {
    livePlaceholder.style.display = 'none';
  }
  const badge = document.getElementById('activePosterStyleBadge');
  if (badge) {
    badge.innerText = '✨ 100% Fresh (Bukan Foto Stok)';
    badge.style.background = '#10B981';
    badge.style.color = '#041008';
  }

  generatedVariations = [
    {
      id: `gen-v1-${Date.now()}`,
      title: 'Variasi 1: Infografis Terang Bulan - Edukasi Efisiensi',
      badge: 'Rekomendasi Utama',
      badgeColor: '#10B981',
      topic: `${CONSULTING_THEMES[themeA].ribbonText}`,
      format: format,
      mediaUrl: mediaUrl1,
      localMedia: media1,
      assetName: assetName1,
      caption: buildConsultingCaption(CONSULTING_THEMES[themeA])
    },
    {
      id: `gen-v2-${Date.now()}`,
      title: 'Variasi 2: Infografis Terang Bulan - Data & Produktivitas',
      badge: 'Tinggi Engagement',
      badgeColor: '#38BDF8',
      topic: `${CONSULTING_THEMES[themeB].ribbonText}`,
      format: format,
      mediaUrl: mediaUrl2,
      localMedia: media2,
      assetName: assetName2,
      caption: buildConsultingCaption(CONSULTING_THEMES[themeB])
    },
    {
      id: `gen-v3-${Date.now()}`,
      title: 'Variasi 3: Infografis Terang Bulan - Manajemen Operasional',
      badge: 'Tinggi Konversi',
      badgeColor: '#F59E0B',
      topic: `${CONSULTING_THEMES[themeC].ribbonText}`,
      format: format,
      mediaUrl: mediaUrl3,
      localMedia: media3,
      assetName: assetName3,
      caption: buildConsultingCaption(CONSULTING_THEMES[themeC])
    }
  ];

  renderGenResults();
  showToast(`✨ Generasi #${genCycleCount}: 3 Konten & Foto Visual Baru Berhasil Dibuat!`);
}

function renderGenResults() {
  const container = document.getElementById('genResultsContainer');
  const statusText = document.getElementById('genStatusText');
  if (!container) return;

  if (statusText) statusText.innerText = `Generasi #${genCycleCount}: ${generatedVariations.length} Variasi Konten & Foto Visual Baru`;
  container.innerHTML = '';

  generatedVariations.forEach((v, idx) => {
    const card = document.createElement('div');
    card.className = 'variation-card';
    card.innerHTML = `
      <div class="variation-header">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="badge" style="background:${v.badgeColor}22; color:${v.badgeColor}; border:1px solid ${v.badgeColor}55;">
            ${v.badge}
          </span>
          <span class="badge" style="background:rgba(56, 189, 248, 0.12); color:#38BDF8; border:1px solid rgba(56, 189, 248, 0.3); font-size:0.7rem;">
            <i class="ri-image-line"></i> ${v.assetName || 'Visual Unik'}
          </span>
          <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase;">${v.format.toUpperCase()}</span>
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">#${idx + 1}</span>
      </div>

      <div class="variation-media-preview">
        <img src="${v.localMedia}" alt="Media" style="box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <div style="flex:1;">
          <div class="variation-hook">${v.caption.split('\n')[0]}</div>
          <div style="margin-top:0.4rem;">
            <button class="btn btn-secondary" style="padding:0.35rem 0.6rem; font-size:0.75rem; border:1px solid #F59E0B; color:#F59E0B; background:rgba(245,158,11,0.12); width:100%; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-weight:700;" onclick="regenerateVariationAiImage(${idx})" title="Generate gambar poster baru khusus untuk variasi ini">
              <i class="ri-sparkling-fill"></i> ✨ Generate Gambar Baru
            </button>
          </div>
        </div>
      </div>

      <div class="variation-snippet">
        ${v.caption.replace(/[\r\n]+/g, ' ')}
      </div>

      <div style="display:flex; gap:0.6rem; margin-top:0.25rem;">
        <button class="btn btn-primary" style="flex:1.4; background:linear-gradient(135deg, #38BDF8, #0284C7); color:#040810; font-weight:800; font-size:0.85rem;" onclick="openPreFlightModal(${idx})">
          <i class="ri-eye-line"></i> Pratinjau & Pengecekan (Pre-Flight)
        </button>
        <button class="btn btn-secondary" style="flex:1; font-size:0.8rem;" onclick="loadIntoCreatorStudio(${idx})">
          <i class="ri-edit-line"></i> Buka di Studio
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function regenerateVariationAiImage(idx) {
  if (!generatedVariations[idx]) return;
  const v = generatedVariations[idx];
  const nextThemeIdx = Math.floor(Math.random() * CONSULTING_THEMES.length);
  const pillarKey = document.getElementById('genPillar')?.value || 'iot_sensor';
  const nextTheme = CONSULTING_THEMES[nextThemeIdx];
  const newDataUrl = createSynthesizedBanner(nextTheme.headline, '', nextThemeIdx, pillarKey);

  v.localMedia = newDataUrl;
  v.mediaUrl = newDataUrl;
  v.assetName = `✨ Poster AI Baru (Tema #${nextThemeIdx + 1})`;
  v.topic = nextTheme.ribbonText;
  v.caption = buildConsultingCaption(nextTheme);
  renderGenResults();
  showToast(`✨ Poster & Caption Terang Bulan Style #${nextThemeIdx + 1} berhasil dibuat!`);
}

// AUTOMATED CANVAS BANNER SYNTHESIZER (DELEGATES TO TERANG BULAN EDITORIAL GENERATOR)
function generateCanvasGraphic(idx) {
  regenerateVariationAiImage(idx);
}

// 14. PRE-FLIGHT REVIEW MODAL LOGIC
function openPreFlightModal(idx) {
  if (!generatedVariations[idx]) return;
  currentPreFlightPost = JSON.parse(JSON.stringify(generatedVariations[idx]));

  // Update Smartphone UI
  const modalClock = document.getElementById('modalPhoneClock');
  if (modalClock) {
    const now = new Date();
    modalClock.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const modalMedia = document.getElementById('modalMediaImg');
  if (modalMedia) modalMedia.src = currentPreFlightPost.localMedia || currentPreFlightPost.mediaUrl;

  const modalCaption = document.getElementById('modalCaptionText');
  if (modalCaption) modalCaption.innerText = currentPreFlightPost.caption;

  const modalEdit = document.getElementById('modalCaptionEdit');
  if (modalEdit) modalEdit.value = currentPreFlightPost.caption;

  // Render Asset Selector inside Modal
  renderModalAssetPicker();

  // Update Quality Gate Checklist
  updatePreFlightChecklist();

  // Show Modal
  const modal = document.getElementById('previewCheckModal');
  if (modal) modal.classList.add('open');
}

function closePreFlightModal() {
  const modal = document.getElementById('previewCheckModal');
  if (modal) modal.classList.remove('open');
}

function onModalCaptionInput(val) {
  if (!currentPreFlightPost) return;
  currentPreFlightPost.caption = val;
  const modalCaption = document.getElementById('modalCaptionText');
  if (modalCaption) modalCaption.innerText = val;
  updatePreFlightChecklist();
}

function updatePreFlightChecklist() {
  if (!currentPreFlightPost) return;
  const len = currentPreFlightPost.caption ? currentPreFlightPost.caption.length : 0;
  const charEl = document.getElementById('checkCharCount');
  if (charEl) {
    charEl.innerText = `${len} / 2.200`;
    charEl.style.color = len > 2200 ? '#EF4444' : '#38BDF8';
  }

  const hashtags = (currentPreFlightPost.caption.match(/#[a-zA-Z0-9_]+/g) || []);
  const tagEl = document.getElementById('checkTagCount');
  if (tagEl) {
    tagEl.innerText = `${hashtags.length} Hashtag`;
    tagEl.style.color = (hashtags.length >= 5 && hashtags.length <= 30) ? '#10B981' : '#F59E0B';
  }
}

function renderModalAssetPicker() {
  const picker = document.getElementById('modalAssetPicker');
  if (!picker) return;
  picker.innerHTML = '';

  const hook = (currentPreFlightPost && currentPreFlightPost.caption) 
    ? (currentPreFlightPost.caption.split('\n')[0] || currentPreFlightPost.topic)
    : 'Solusi Pertanian Cerdas Agrotech';

  const designOptions = [
    { label: '🌾 Produktivitas', themeIdx: 0, color: '#EAB308' },
    { label: '⚙️ 5 Tanda IoT', themeIdx: 1, color: '#10B981' },
    { label: '💧 Fertigasi', themeIdx: 2, color: '#38BDF8' },
    { label: '🛰️ Drone NDVI', themeIdx: 3, color: '#0284C7' },
    { label: '📊 Stop Bocor', themeIdx: 4, color: '#F59E0B' },
    { label: '🏆 Grade A', themeIdx: 5, color: '#22C55E' }
  ];

  designOptions.forEach((opt, idx) => {
    const thumb = document.createElement('div');
    const themeObj = CONSULTING_THEMES[opt.themeIdx];
    const bannerUrl = createSynthesizedBanner(themeObj.headline, '', opt.themeIdx, 'yield_optimization');
    thumb.className = 'asset-thumb';
    thumb.style.height = '64px';
    thumb.style.minWidth = '92px';
    thumb.style.cursor = 'pointer';
    thumb.style.borderRadius = '8px';
    thumb.style.border = `1.5px solid ${opt.color}66`;
    thumb.style.background = 'rgba(0,0,0,0.5)';
    thumb.style.padding = '3px';
    thumb.innerHTML = `
      <img src="${bannerUrl}" alt="${opt.label}" style="width:100%; height:40px; object-fit:cover; border-radius:4px;">
      <div style="font-size:0.62rem; color:${opt.color}; text-align:center; font-weight:700; margin-top:2px;">${opt.label}</div>
    `;
    thumb.onclick = () => {
      picker.querySelectorAll('.asset-thumb').forEach(t => t.style.borderColor = 'rgba(255,255,255,0.1)');
      thumb.style.borderColor = opt.color;
      currentPreFlightPost.localMedia = bannerUrl;
      currentPreFlightPost.mediaUrl = bannerUrl;
      currentPreFlightPost.assetName = `✨ ${themeObj.ribbonText}`;
      currentPreFlightPost.topic = themeObj.ribbonText;
      currentPreFlightPost.caption = buildConsultingCaption(themeObj);

      const modalMedia = document.getElementById('modalMediaImg');
      if (modalMedia) modalMedia.src = bannerUrl;

      const modalCaption = document.getElementById('modalCaptionText');
      if (modalCaption) modalCaption.innerText = currentPreFlightPost.caption;

      const modalEdit = document.getElementById('modalCaptionEdit');
      if (modalEdit) modalEdit.value = currentPreFlightPost.caption;

      updatePreFlightChecklist();
      showToast(`🎨 Tema Infografis: "${themeObj.ribbonText}" diterapkan!`);
    };
    picker.appendChild(thumb);
  });
}

function rotateModalPhotoVisual() {
  regenerateCurrentModalImage();
}

function regenerateCurrentModalImage() {
  if (!currentPreFlightPost) return;
  const nextThemeIdx = Math.floor(Math.random() * CONSULTING_THEMES.length);
  const theme = CONSULTING_THEMES[nextThemeIdx];
  const pillarKey = document.getElementById('genPillar')?.value || 'yield_optimization';
  const newDataUrl = createSynthesizedBanner(theme.headline, '', nextThemeIdx, pillarKey);

  currentPreFlightPost.localMedia = newDataUrl;
  currentPreFlightPost.mediaUrl = newDataUrl;
  currentPreFlightPost.assetName = `✨ ${theme.ribbonText}`;
  currentPreFlightPost.topic = theme.ribbonText;
  currentPreFlightPost.caption = buildConsultingCaption(theme);

  const modalMedia = document.getElementById('modalMediaImg');
  if (modalMedia) modalMedia.src = newDataUrl;

  const modalCaption = document.getElementById('modalCaptionText');
  if (modalCaption) modalCaption.innerText = currentPreFlightPost.caption;

  const modalEdit = document.getElementById('modalCaptionEdit');
  if (modalEdit) modalEdit.value = currentPreFlightPost.caption;

  updatePreFlightChecklist();
  showToast(`✨ Poster & Caption Terang Bulan Style: "${theme.ribbonText}" siap!`);
}

function publishDirectFromModal() {
  if (!currentPreFlightPost) return;
  const visualLabel = currentPreFlightPost.assetName || 'Foto Terpilih';
  const confirmed = confirm(`Konfirmasi Publikasi ke Instagram:\n\nAkun: @cvagrotechnology\nTopik: ${currentPreFlightPost.topic}\nGambar: ${visualLabel}\n\nApakah Anda yakin ingin langsung menerbitkan postingan ini ke Instagram sekarang?`);
  if (!confirmed) return;

  // Add to postsData as published
  const newPost = {
    id: `post-${Date.now()}`,
    topic: currentPreFlightPost.topic,
    category: 'promo',
    format: currentPreFlightPost.format || 'feed',
    mediaUrl: currentPreFlightPost.mediaUrl || currentPreFlightPost.localMedia,
    localMedia: currentPreFlightPost.localMedia || currentPreFlightPost.mediaUrl,
    assetName: visualLabel,
    caption: currentPreFlightPost.caption,
    date: new Date().toISOString().split('T')[0],
    time: 'Sekarang',
    status: 'published'
  };

  postsData.unshift(newPost);
  savePostsToStorage();
  renderAllTables();
  renderCalendar();

  closePreFlightModal();
  attemptMetaGraphPublish(currentPreFlightPost);
}

function scheduleFromModal() {
  if (!currentPreFlightPost) return;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const targetDate = prompt('Masukkan tanggal penayangan (YYYY-MM-DD):', tomorrowStr);
  if (!targetDate) return;

  const newPost = {
    id: `post-${Date.now()}`,
    topic: currentPreFlightPost.topic,
    category: 'promo',
    format: currentPreFlightPost.format || 'feed',
    mediaUrl: currentPreFlightPost.localMedia || currentPreFlightPost.mediaUrl,
    caption: currentPreFlightPost.caption,
    date: targetDate,
    time: '17:00 WIB',
    status: 'scheduled'
  };

  postsData.unshift(newPost);
  savePostsToStorage();
  renderAllTables();
  renderCalendar();

  closePreFlightModal();
  showToast(`📅 Postingan berhasil dijadwalkan untuk ${targetDate}!`);
  switchTab('queue');
}

function loadIntoCreatorStudio(idx) {
  if (!generatedVariations[idx]) return;
  const v = generatedVariations[idx];

  const captionInput = document.getElementById('captionInput');
  const topicInput = document.getElementById('topicInput');
  const publicUrlInput = document.getElementById('publicMediaUrlInput');

  if (captionInput) captionInput.value = v.caption;
  if (topicInput) topicInput.value = v.topic;
  if (publicUrlInput) publicUrlInput.value = v.mediaUrl;

  currentSelectedAsset = v.localMedia || v.mediaUrl;

  const phoneCaption = document.getElementById('phoneCaptionText');
  if (phoneCaption) phoneCaption.innerText = v.caption;

  const phoneMedia = document.getElementById('phoneMediaImg');
  if (phoneMedia) phoneMedia.src = v.localMedia || v.mediaUrl;

  // Highlight thumbnail in assetPickerGrid
  const pickerGrid = document.getElementById('assetPickerGrid');
  if (pickerGrid) {
    pickerGrid.querySelectorAll('.asset-thumb').forEach(thumb => {
      const img = thumb.querySelector('img');
      const targetSrc = v.localMedia || v.mediaUrl;
      if (img && targetSrc && (targetSrc.includes(img.getAttribute('src')) || img.getAttribute('src').includes(targetSrc))) {
        thumb.classList.add('selected');
      } else {
        thumb.classList.remove('selected');
      }
    });
  }

  switchTab('creator');
  showToast(`Konten & gambar "${v.assetName || 'Visual'}" dimuat ke Post Creator Studio!`);
}

