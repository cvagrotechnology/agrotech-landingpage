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

// DAFTAR 6 FORMAT TEMA INFOGRAFIS BERVARIASI PERSIS POSTINGAN @terangbulan.consulting
// SETIAP TEMA MEMILIKI ARSITEKTUR LAYOUT VISUAL YANG BERBEDA SECARA STRUKTURAL
const CONSULTING_THEMES = [
  // THEME 0: BENTO 2x2 GRID (4 Kunci Produktivitas Lahan)
  {
    layoutType: 'bento_2x2',
    name: 'Bento 2x2 Grid',
    ribbonText: 'LAHAN SAMA, HASIL HARUS BERBEDA',
    headline: 'Mengapa Produktivitas Kebun Harus Naik, Bukan Sekadar Luas Lahan?',
    c1Title: 'EFISIENSI LEBIH PENTING',
    c1Desc: 'Maksimalkan potensi hasil dari lahan yang sudah ada sebelum membuka areal baru.',
    c2Title: 'PRODUKTIVITAS = PROFIT',
    c2Desc: 'Hasil per hektare yang tinggi membantu efisiensi biaya dan meningkatkan laba bersih.',
    c3Title: 'DATA TENTUKAN KEPUTUSAN',
    c3Desc: 'Monitoring kondisi tanah, pupuk, air, dan tanaman temukan masalah lebih cepat.',
    c4Title: 'MANAJEMEN NAIK KELAS',
    c4Desc: 'SOP konsisten, teknologi cerdas, dan evaluasi berkala hasilkan panen optimal.',
    quote1: 'Bukan soal punya lahan lebih luas.',
    quote2: 'Tapi bagaimana membuat setiap hektare menghasilkan lebih optimal.',
    heroIdx: 1 // ig_aerial_ndvi_farm.jpg
  },

  // THEME 1: 5-ROW VERTICAL CHECKLIST AUDIT (5 Tanda Butuh Transformasi Kebun)
  {
    layoutType: 'checklist_5',
    name: '5 Checklist Audit',
    ribbonText: 'AUDIT LAPANGAN PERKEBUNAN',
    headline: '5 Tanda Kebun Anda Mendesak Butuh Sentuhan Teknologi & IoT',
    checklist: [
      {
        num: '01',
        title: 'BIAYA PUPUK MEMBENGKAK TANPA KENAIKAN TONASE',
        desc: 'Aplikasi pupuk tanpa takaran sensor tanah menguras anggaran tanpa diiringi kenaikan panen.',
        tag: 'BIAYA BOROS'
      },
      {
        num: '02',
        title: 'KONDISI TANAH & LENGAS TIDAK PERNAH TERUKUR',
        desc: 'pH tanah drop atau kelembaban ekstrem memicu stres akar dan tanaman mudah layu terserang hama.',
        tag: 'BUTA DATA'
      },
      {
        num: '03',
        title: 'SERANGAN HAMA & PENYAKIT SELALU TELAT DIKETAHUI',
        desc: 'Baru ditangani saat daun kuning meluas, bukan sejak fase deteksi dini klorofil via drone NDVI.',
        tag: 'SERANGAN HAMA'
      },
      {
        num: '04',
        title: 'PEMBUKUAN KAS & MANDOR MASIH PAKAI NOTA KERTAS',
        desc: 'Catatan basah, nota sobek, dan selisih timbangan di pos panen tidak pernah terlacak transparan.',
        tag: 'NOTA HILANG'
      },
      {
        num: '05',
        title: 'KESERAGAMAN BUAH RENDAH (GRADE B & C TINGGI)',
        desc: 'Distribusi air dan fertigasi tidak merata menyebabkan ukuran dan bobot buah panen belang-belang.',
        tag: 'GRADE BELANG'
      }
    ],
    alert1: 'EVALUASI MANDIRI KEBUN ANDA',
    alert2: 'Jika kebun Anda mengalami 2 tanda di atas, segera jadwalkan audit SOP bersama tim agronomis Agrotech.',
    heroIdx: 0 // ig_soil_probe_iot.jpg
  },

  // THEME 2: 2-COLUMN SIDE-BY-SIDE VS COMPARISON (Cara Lama vs Solusi Modern)
  {
    layoutType: 'comparison_vs',
    name: 'VS Perbandingan',
    ribbonText: 'PERBANDINGAN STRATEGIS',
    headline: 'Metode Konvensional vs Smart Farming Presisi',
    vsOldTitle: 'CARA KONVENSIONAL (LAMA)',
    vsOldItems: [
      { t: 'Takaran Dosis Kira-Kira', d: 'Pupuk disebar tanpa data riil uji kesuburan tanah.' },
      { t: 'Penyiraman Manual', d: 'Jadwal siram hanya mengira-ira, rawan becek & layu.' },
      { t: 'Catatan Mandor di Buku', d: 'Kertas basah, nota tercecer, pembukuan sering selisih.' },
      { t: 'Timbangan Panen Pos Rawan Bocor', d: 'Data hasil panen telat sampai ke telinga pemilik kebun.' }
    ],
    vsOldResult: 'DAMPAK: Biaya Boros & Hasil Panen Fluktuatif',
    vsNewTitle: 'SOLUSI AGROTECH CERDAS',
    vsNewItems: [
      { t: 'Dosis NPK Presisi Sensor', d: 'Nutrisi diukur berdasarkan pH & lengas riil tanah.' },
      { t: 'Fertigasi Solenoid Otomatis', d: 'Katup pengairan membuka teratur sesuai kebutuhan tanaman.' },
      { t: 'Rekapitulasi Cloud di HP', d: 'Absensi mandor dan stok pupuk tercatat otomatis.' },
      { t: 'Timbangan Pos Terhubung Live', d: 'Tonase panen langsung masuk dashboard pemilik seketika.' }
    ],
    vsNewResult: 'DAMPAK: Hemat Biaya 35% & Panen Seragam Grade A',
    summaryQuote: 'Modernisasi kebun bukan sekadar biaya, tapi strategi menghentikan kebocoran profit.',
    heroIdx: 4 // ig_greenhouse_iot.jpg
  },

  // THEME 3: BIG STAT ROI HIGHLIGHT (Angka & Bukti Finansial Riil)
  {
    layoutType: 'big_stat_roi',
    name: 'Big Stat ROI',
    ribbonText: 'BUKTI DATA & ROI FINANSIAL',
    headline: 'Pangkas Pemborosan Biaya Operasional Kebun Hingga 35%',
    bigStat: '35%',
    bigStatLabel: 'PENGHEMATAN BIAYA PUPUK & AIR PER HEKTAR',
    subDetails: 'Terbukti pada audit implementasi kebun hortikultura & komoditas perkebunan.',
    metrics: [
      { val: '+28%', label: 'Kenaikan Tonase Grade A' },
      { val: '100%', label: 'Transparansi Stok & Kas' },
      { val: '10 Mnt', label: 'Audit Spasial 50 Ha' }
    ],
    card1Title: '💧 SMART FERTIGATION PRESISI',
    card1Desc: 'Pupuk cair terlarut disalurkan langsung ke zona perakaran aktif tanpa menguap sia-sia atau hanyut tergerus hujan.',
    card2Title: '🛰️ SENSUS & AUDIT NDVI DRONE',
    card2Desc: 'Kamera multispektral membaca stres tanaman dan zonasi defisiensi hara sebelum bercak daun menular ke seluruh blok.',
    quote1: 'Keputusan agribisnis terbaik',
    quote2: 'dilahirkan dari data lapangan yang presisi, bukan sekadar firasat.',
    heroIdx: 6 // ig_drone_multispectral.jpg
  },

  // THEME 4: 3-TAHAP HORIZONTAL FLOW TIMELINE (Roadmap Transformasi Kebun)
  {
    layoutType: 'steps_timeline',
    name: '3 Alur Tahap',
    ribbonText: 'ROADMAP TRANSFORMASI KEBUN',
    headline: '3 Langkah Strategis Mengubah Kebun Menjadi Mesin Profit Terukur',
    steps: [
      {
        num: '01',
        tag: 'FASE 01: SENSUS & DIAGNOSTIK',
        title: 'Pemetaan Drone NDVI & Uji Hara Tanah Laboratorium',
        desc: 'Scan aerial multispektral 50 ha, sensus populasi pohon produktif, dan petakan zona kritis yang butuh perbaikan segera.'
      },
      {
        num: '02',
        tag: 'FASE 02: OTOMASI IOT & SMART FERTIGASI',
        title: 'Instalasi Sensor Nirkabel & Solenoid Nutrisi Otomatis',
        desc: 'Katup pengairan nutrisi membuka presisi sesuai lengas tanah riil, memangkas pemborosan pupuk hingga 35%.'
      },
      {
        num: '03',
        tag: 'FASE 03: CONTROLLING ERP & OPTIMASI PANEN',
        title: 'Integrasi Timbangan Live & Dashboard Finansial HP',
        desc: 'Catatan borongan mandor, rekapitulasi timbangan panen live, dan analisis HPP per kg langsung di genggaman pemilik.'
      }
    ],
    tipTitle: 'PENDAMPINGAN KONSULTAN LAPANGAN',
    tipText: 'Tim agronomis Agrotech mendampingi kebun Anda di setiap tahapan transformasi hingga SOP berjalan mandiri dan panen optimal.',
    heroIdx: 5 // ig_smart_tractor.jpg
  },

  // THEME 5: EXECUTIVE EDITORIAL QUOTE (Filosofi & Mindset Agribisnis Modern)
  {
    layoutType: 'editorial_quote',
    name: 'Quote Mindset',
    ribbonText: 'MINDSET AGRIBISNIS MODERN',
    headline: 'Bukan Luas Lahan yang Menentukan Profit, Tapi Bagaimana Anda Mengelolanya',
    mainQuote: 'Kebun yang sukses bukan yang lahannya paling luas, melainkan yang setiap jengkal tanahnya dikelola dengan data yang presisi.',
    subQuote: 'Membuka areal baru tanpa sistem hanya melipatgandakan pemborosan. Mulai dengan efisiensi pemupukan, standarisasi SOP budidaya, dan pengawasan berbasis sensor cerdas.',
    author: 'CV AGROTEKNOLOGI NUSANTARA',
    role: 'Partner Konsultasi & Transformasi Digital Agribisnis Indonesia',
    pills: ['📊 Data Driven', '🌱 SOP Terukur', '⚙️ Efisiensi Biaya'],
    tipText: 'Simpan insight ini sebagai panduan arah strategi perkebunan Anda.',
    heroIdx: 2 // ig_harvest_success.jpg
  }
];

function buildConsultingCaption(t, idx) {
  const themeIndex = (typeof idx === 'number') ? idx : 0;
  const layout = t.layoutType || 'bento_2x2';

  if (layout === 'checklist_5') {
    return `${t.ribbonText}.

${t.headline}

Banyak pemilik kebun mengeluhkan biaya operasional yang terus naik tetapi tonase panen jalan di tempat. Seringkali, kebocoran terjadi pada hal-hal mendasar yang luput dari pantauan harian.

📋 5 TANDA PERIKSA AUDIT KEBUN ANDA:

1️⃣ ${t.checklist[0].title}
👉 ${t.checklist[0].desc}

2️⃣ ${t.checklist[1].title}
👉 ${t.checklist[1].desc}

3️⃣ ${t.checklist[2].title}
👉 ${t.checklist[2].desc}

4️⃣ ${t.checklist[3].title}
👉 ${t.checklist[3].desc}

5️⃣ ${t.checklist[4].title}
👉 ${t.checklist[4].desc}

⚠️ EVALUASI KEBUN ANDA:
Jika kebun Anda mengalami minimal 2 dari 5 tanda di atas, sudah saatnya melakukan audit SOP dan transformasi digital kebun bersama kami.

🔖 Simpan postingan ini untuk checklist evaluasi mandor dan tim kebun Anda!
Konsultasi & Audit Lapangan bersama CV Agroteknologi Nusantara:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#SmartFarming #AuditKebun #Agrotech #KonsultanPerkebunan #ManajemenKebun #AgribisnisIndonesia #PertanianPresisi #cvagrotechnology`;
  }

  if (layout === 'comparison_vs') {
    return `${t.ribbonText}.

${t.headline}

Apakah cara mengelola kebun Anda saat ini masih mengandalkan perkiraan dan kebiasaan lama?
Mari bandingkan dampak finansial dan operasional antara pendekatan konvensional vs sistem cerdas berbasis data:

❌ METODE KONVENSIONAL (LAMA):
• ${t.vsOldItems[0].t} — ${t.vsOldItems[0].d}
• ${t.vsOldItems[1].t} — ${t.vsOldItems[1].d}
• ${t.vsOldItems[2].t} — ${t.vsOldItems[2].d}
• ${t.vsOldItems[3].t} — ${t.vsOldItems[3].d}
👉 Hasil: ${t.vsOldResult}

VS

✅ SOLUSI CERDAS AGROTECH:
• ${t.vsNewItems[0].t} — ${t.vsNewItems[0].d}
• ${t.vsNewItems[1].t} — ${t.vsNewItems[1].d}
• ${t.vsNewItems[2].t} — ${t.vsNewItems[2].d}
• ${t.vsNewItems[3].t} — ${t.vsNewItems[3].d}
👉 Hasil: ${t.vsNewResult}

💡 "${t.summaryQuote}"

🔖 Simpan postingan ini agar tidak salah langkah dalam investasi kebun!
Konsultasikan modernisasi perkebunan Anda bersama CV Agroteknologi Nusantara:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#SmartFarming #PerbandinganMetode #Agrotech #KonsultanAgribisnis #EfisiensiPupuk #ModernisasiPertanian #IoTPertanian #cvagrotechnology`;
  }

  if (layout === 'big_stat_roi') {
    return `${t.ribbonText}.

${t.headline}

Bagi pengusaha agribisnis dan pemilik perkebunan, angka efisiensi bukan sekadar teori, melainkan penentu kelangsungan laba bersih usaha.

📊 BUKTI DATA LAPANGAN AGROTECH:
🔥 ${t.bigStat} ${t.bigStatLabel}
📈 ${t.metrics[0].val} — ${t.metrics[0].label}
💼 ${t.metrics[1].val} — ${t.metrics[1].label}
🛰️ ${t.metrics[2].val} — ${t.metrics[2].label}

Bagaimana sistem ini memangkas biaya operasional kebun Anda?
💧 1. ${t.card1Title}
${t.card1Desc}

🛰️ 2. ${t.card2Title}
${t.card2Desc}

💡 "${t.quote1} ${t.quote2}"

🔖 Simpan insight data ini untuk diskusi anggaran kebun tahun ini!
Konsultasi & Hitung Potensi Efisiensi Kebun Anda:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#SmartFarming #ROIKebun #EfisiensiBiaya #Agrotech #FertigasiPresisi #DroneNDVI #AgribisnisIndonesia #cvagrotechnology`;
  }

  if (layout === 'steps_timeline') {
    return `${t.ribbonText}.

${t.headline}

Banyak pemilik kebun ragu memulai modernisasi karena takut rumit atau khawatir mandor tidak siap. Padahal, transformasi yang sukses selalu dijalankan bertahap dengan SOP yang jelas:

🚀 3 TAHAP ROADMAP TRANSFORMASI AGROTECH:

📍 ${t.steps[0].tag}
${t.steps[0].title}
👉 ${t.steps[0].desc}

📍 ${t.steps[1].tag}
${t.steps[1].title}
👉 ${t.steps[1].desc}

📍 ${t.steps[2].tag}
${t.steps[2].title}
👉 ${t.steps[2].desc}

🎯 ${t.tipTitle}:
${t.tipText}

🔖 Simpan roadmap ini sebagai panduan melangkah bagi manajemen kebun Anda!
Mulai transformasi kebun Anda hari ini bersama CV Agroteknologi Nusantara:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#SmartFarming #RoadmapKebun #Agrotech #SOPPerkebunan #TransformasiDigital #KonsultanPerkebunan #AgribisnisIndonesia #cvagrotechnology`;
  }

  if (layout === 'editorial_quote') {
    return `${t.ribbonText}.

"${t.mainQuote}"

Seringkali kita melihat pemilik lahan berlomba-lomba memperluas hektare kebunnya. Namun tanpa SOP budidaya yang presisi dan pembukuan data yang rapi, membuka lahan baru justru mempercepat kebocoran biaya.

${t.subQuote}

Tiga pilar utama agribisnis modern:
📊 1. Keputusan Berbasis Data Riil (Bukan Firasat)
🌱 2. Standar Operasional Prosedur (SOP) Terukur
⚙️ 3. Efisiensi Biaya Operasional Berkelanjutan

Mari naik kelas bersama mitra agronomis terpercaya.

🔖 Simpan insight ini sebagai pengingat arah visi bisnis perkebunan Anda!
Konsultasi & Diskusi Strategis bersama CV Agroteknologi Nusantara:
📲 Amanda: 0857-1385-0615
📲 Hardadi: 0813-1307-8216
🌐 www.cvagrotechnology.com

#MindsetAgribisnis #KonsultanPerkebunan #SmartFarming #Agrotech #PetaniMilenial #PertanianIndonesia #ManajemenKebun #cvagrotechnology`;
  }

  // DEFAULT: BENTO 2x2
  return `${t.ribbonText}.

${t.headline}

Apakah meningkatkan produktivitas kebun harus selalu dengan menambah luas lahan? Belum tentu.
Justru, tantangan agribisnis modern adalah bagaimana membuat setiap hektare menghasilkan lebih optimal dan terukur.

📌 4 PILAR PENTING PRODUKTIVITAS LAHAN:

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

// SEED 6 POSTINGAN DEFAULT DENGAN FORMAT BERAGAM PERSIS @terangbulan.consulting
INITIAL_POSTS.push(
  {
    id: 'post-tb-1',
    topic: 'LAHAN SAMA, HASIL HARUS BERBEDA',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_aerial_ndvi_farm.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[0], 0),
    date: '2026-10-23',
    time: '08:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-2',
    topic: 'AUDIT LAPANGAN PERKEBUNAN',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_soil_probe_iot.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[1], 1),
    date: '2026-10-25',
    time: '10:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-3',
    topic: 'PERBANDINGAN STRATEGIS',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_greenhouse_iot.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[2], 2),
    date: '2026-10-27',
    time: '14:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-4',
    topic: 'BUKTI DATA & ROI FINANSIAL',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_drone_multispectral.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[3], 3),
    date: '2026-10-29',
    time: '09:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-5',
    topic: 'ROADMAP TRANSFORMASI KEBUN',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_smart_tractor.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[4], 4),
    date: '2026-10-31',
    time: '16:00',
    status: 'scheduled'
  },
  {
    id: 'post-tb-6',
    topic: 'MINDSET AGRIBISNIS MODERN',
    category: 'edu',
    format: 'feed',
    mediaUrl: 'assets/ig_harvest_success.jpg',
    caption: buildConsultingCaption(CONSULTING_THEMES[5], 5),
    date: '2026-11-02',
    time: '11:00',
    status: 'scheduled'
  }
);

// ============================================================================
// HUMAN EDITORIAL DESIGN ENGINE (INSPIRED BY @terangbulan.consulting)
// Desain Alami, Humanis, Bersih, Whitespace Mewah, Tanpa Elemen Kaku / AI Slop
// ============================================================================

// 1. ORGANIC BOTANICAL PALM FRONDS (Sentuhan Alami Perkebunan di Sudut Kanvas)
function drawBotanicalFronds(ctx, x, y, angle, scale, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = `rgba(21, 128, 61, ${alpha || 0.15})`;

  ctx.beginPath();
  // Tangkai Daun Utama
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(80, -90, 160, -180);

  // Daun-daun samping (Fronds)
  for (let i = 20; i <= 150; i += 16) {
    const t = i / 150;
    const sx = t * 80;
    const sy = t * -90 + (1 - t) * 0;

    // Daun Kanan
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 40, sy - 22, sx + 52, sy - 10);
    ctx.quadraticCurveTo(sx + 24, sy + 6, sx, sy);

    // Daun Kiri
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 38, sy - 20, sx - 48, sy - 8);
    ctx.quadraticCurveTo(sx - 22, sy + 6, sx, sy);
  }
  ctx.fill();
  ctx.restore();
}

// 2. ORGANIC BRUSH / HIGHLIGHTER RIBBON (Signature Mustard Ribbon Terang Bulan)
function drawOrganicBrushRibbon(ctx, x, y, text, color, textColor) {
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  const textWidth = ctx.measureText(text).width;
  const ribbonW = textWidth + 44;
  const ribbonH = 46;

  // Bentuk pita highlighter dinamis (sedikit miring berserat alami)
  ctx.fillStyle = color || '#EAB308';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + ribbonW + 12, y - 2);
  ctx.lineTo(x + ribbonW + 4, y + ribbonH + 2);
  ctx.lineTo(x - 10, y + ribbonH);
  ctx.closePath();
  ctx.fill();

  // Streak highlight lembut
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(x + 4, y + 4, ribbonW - 12, 4);

  // Teks pita
  ctx.fillStyle = textColor || '#0A2540';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(text, x + 16, y + 31);
  ctx.restore();
}

// 3. CLEAN VECTOR ICONS (Ikon Grafis Bersih Bebas AI Slop)
function drawVectorIcon(ctx, cx, cy, type, color) {
  ctx.save();
  ctx.strokeStyle = color || '#FFFFFF';
  ctx.fillStyle = color || '#FFFFFF';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'leaf') {
    // Daun Tunas Hijau
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 10);
    ctx.quadraticCurveTo(cx - 12, cy - 10, cx + 10, cy - 12);
    ctx.quadraticCurveTo(cx + 12, cy + 10, cx - 10, cy + 10);
    ctx.fill();
    ctx.strokeStyle = '#0F2B4E';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 7);
    ctx.lineTo(cx + 6, cy - 6);
    ctx.stroke();
  } else if (type === 'chart') {
    // Grafik Tren Naik
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 9);
    ctx.lineTo(cx - 4, cy + 1);
    ctx.lineTo(cx + 2, cy + 5);
    ctx.lineTo(cx + 12, cy - 9);
    ctx.stroke();
    // Mata Panah
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 9);
    ctx.lineTo(cx + 12, cy - 9);
    ctx.lineTo(cx + 12, cy - 2);
    ctx.stroke();
  } else if (type === 'search') {
    // Kaca Pembesar / Audit Data
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy + 3);
    ctx.lineTo(cx + 11, cy + 11);
    ctx.stroke();
  } else if (type === 'gear') {
    // Roda Gigi / Manajemen SOP
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const gx = cx + Math.cos(a) * 9;
      const gy = cy + Math.sin(a) * 9;
      ctx.beginPath();
      ctx.arc(gx, gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'water') {
    // Tetesan Air / Fertigasi
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(cx + 10, cy, cx + 8, cy + 6);
    ctx.arc(cx, cy + 6, 8, 0, Math.PI);
    ctx.quadraticCurveTo(cx - 10, cy, cx, cy - 12);
    ctx.fill();
  } else if (type === 'check') {
    // Centang Hijau Bersih
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.lineTo(cx + 10, cy - 7);
    ctx.stroke();
  } else if (type === 'cross') {
    // Silang Merah
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.moveTo(cx + 7, cy - 7);
    ctx.lineTo(cx - 7, cy + 7);
    ctx.stroke();
  } else if (type === 'bulb') {
    // Bohlam Insight
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(cx - 3, cy + 6, 6, 3.5);
  } else if (type === 'bookmark') {
    // Pita Bookmark Simpan
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 9);
    ctx.lineTo(cx + 6, cy - 9);
    ctx.lineTo(cx + 6, cy + 9);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 6, cy + 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// 4. SIGNATURE CALLOUT BAR (Pita Navy + Bohlam Emas + Tombol SAVE Kuning)
function drawHumanCalloutBar(ctx, x, y, w, h, line1, line2, saveText) {
  ctx.save();
  // Kapsul Navy Elegan
  ctx.fillStyle = '#0B2545';
  drawRoundRectPath(ctx, x, y, w, h, 18);
  ctx.fill();

  // Bohlam Emas di Kiri
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(x + 50, y + h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, x + 50, y + h / 2, 'bulb', '#0B2545');

  // Teks Insight Tengah
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(line1, x + 92, y + 36);

  ctx.fillStyle = '#FCD34D';
  ctx.font = '16px sans-serif';
  ctx.fillText(line2, x + 92, y + 64);

  // Tombol SAVE Kuning di Kanan (Persis Terang Bulan)
  const saveW = 270;
  const saveX = x + w - saveW - 16;
  const saveY = y + 14;
  const saveH = h - 28;

  ctx.fillStyle = '#EAB308';
  drawRoundRectPath(ctx, saveX, saveY, saveW, saveH, 12);
  ctx.fill();

  drawVectorIcon(ctx, saveX + 24, saveY + saveH / 2, 'bookmark', '#0B2545');

  ctx.fillStyle = '#0A2540';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('SAVE ➔', saveX + 40, saveY + 26);

  ctx.fillStyle = '#1E3A5F';
  ctx.font = '11.5px sans-serif';
  ctx.fillText('Simpan insight kebun Anda', saveX + 40, saveY + 44);

  ctx.restore();
}

// 5. LOGO RESMI AGROTECH (Clean White Capsule + Verified Badge)
function renderAgrotechLogo(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  drawRoundRectPath(ctx, x, y, 220, 60, 14);
  ctx.fill();
  ctx.shadowBlur = 0; // reset

  // Ikon Kotak Agrotech
  ctx.fillStyle = '#0F2B4E';
  drawRoundRectPath(ctx, x + 12, y + 9, 44, 42, 8);
  ctx.fill();

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('AG', x + 20, y + 37);

  // Teks Logo
  ctx.fillStyle = '#0F2B4E';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AGROTECH', x + 66, y + 27);

  ctx.fillStyle = '#64748B';
  ctx.font = '9.5px sans-serif';
  ctx.fillText('SMART AGRIBISNIS', x + 66, y + 44);

  // Verified Blue Tick
  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(x + 198, y + 22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('✓', x + 194.5, y + 26);

  ctx.restore();
}

// 6. FOOTER RESMI AGROTECH (Navy Bar + Botanical Fronds + Hotline)
function renderAgrotechFooter(ctx) {
  ctx.save();
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

  // Aksen Daun Fronds Alami di Kedua Sudut Bawah
  drawBotanicalFronds(ctx, 40, 1060, -0.2, 0.9, 0.28);
  drawBotanicalFronds(ctx, 1040, 1060, 2.9, 0.85, 0.22);

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
  ctx.restore();
}

// ============================================================================
// 6 ARSITEKTUR LAYOUT HUMANIS PERSIS @terangbulan.consulting
// ============================================================================

// LAYOUT 0: SIGNATURE 4-PILLAR EDITORIAL (1-to-1 PERSIS POSTINGAN TERANG BULAN)
function renderLayoutBento2x2(ctx, t, photo, customHook) {
  // 1. Foto Hero Alami Memenuhi Atas (Full Bleed 56% Kanvas)
  const heroH = 590;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    const pGrad = ctx.createLinearGradient(0, 0, 1080, heroH);
    pGrad.addColorStop(0, '#1E3A2F');
    pGrad.addColorStop(0.6, '#2D5A43');
    pGrad.addColorStop(1, '#4A7C59');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, 0, 1080, heroH);
  }

  // Soft natural gradient scrim di bagian atas foto
  const topScrim = ctx.createLinearGradient(0, 0, 0, 260);
  topScrim.addColorStop(0, 'rgba(6, 24, 44, 0.7)');
  topScrim.addColorStop(1, 'rgba(6, 24, 44, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, 1080, 260);

  // Logo Kanan Atas
  renderAgrotechLogo(ctx, 815, 24);

  // Pita Kuning Highlighter Kiri Atas (Khas Terang Bulan)
  drawOrganicBrushRibbon(ctx, 45, 26, '🌾 ' + (t.ribbonText || 'LAHAN SAMA, HASIL HARUS BERBEDA'), '#EAB308', '#0A2540');

  // Headline Kuat & Elegan di Atas Foto
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 36px sans-serif';
  const headline = customHook || t.headline;
  wrapTextLines(ctx, headline, 45, 126, 740, 46);
  ctx.restore();

  // 2. LEMBAR KARTU PUTIH ELEGAN (Mulai y=515 melengkung ke atas, Persis Terang Bulan)
  const sheetY = 515;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = -6;

  ctx.beginPath();
  ctx.moveTo(0, sheetY + 36);
  ctx.quadraticCurveTo(0, sheetY, 36, sheetY);
  ctx.lineTo(1080 - 36, sheetY);
  ctx.quadraticCurveTo(1080, sheetY, 1080, sheetY + 36);
  ctx.lineTo(1080, 938);
  ctx.lineTo(0, 938);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. 4 ITEM EDITORIAL BERSIH (2 Kolom x 2 Baris, TANPA KOTAK KAKU)
  const col1X = 60;
  const col2X = 560;
  const row1Y = 550;
  const row2Y = 675;

  const items = [
    {
      num: '01',
      title: t.c1Title || 'EFISIENSI LEBIH PENTING',
      desc: t.c1Desc || 'Maksimalkan potensi hasil dari lahan yang sudah ada sebelum membuka areal baru.',
      color: '#15803D',
      icon: 'leaf',
      x: col1X,
      y: row1Y
    },
    {
      num: '02',
      title: t.c2Title || 'PRODUKTIVITAS = KUNCI PROFIT',
      desc: t.c2Desc || 'Hasil per hektare yang tinggi membantu efisiensi biaya dan meningkatkan laba.',
      color: '#0284C7',
      icon: 'chart',
      x: col2X,
      y: row1Y
    },
    {
      num: '03',
      title: t.c3Title || 'DATA MENENTUKAN KEPUTUSAN',
      desc: t.c3Desc || 'Monitoring kondisi tanah, pupuk, air, dan tanaman temukan masalah lebih cepat.',
      color: '#0D9488',
      icon: 'search',
      x: col1X,
      y: row2Y
    },
    {
      num: '04',
      title: t.c4Title || 'MANAJEMEN KEBUN NAIK KELAS',
      desc: t.c4Desc || 'SOP konsisten, teknologi cerdas, dan evaluasi berkala hasilkan panen optimal.',
      color: '#16A34A',
      icon: 'gear',
      x: col2X,
      y: row2Y
    }
  ];

  items.forEach(it => {
    // Lingkaran Ikon Berwarna
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.arc(it.x + 28, it.y + 36, 28, 0, Math.PI * 2);
    ctx.fill();

    // Ikon Vektor Bersih di Dalam Lingkaran
    drawVectorIcon(ctx, it.x + 28, it.y + 36, it.icon, '#FFFFFF');

    // Angka 01-04 Biru Tegas
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(it.num, it.x + 70, it.y + 24);

    // Judul Item Huruf Kapital Navy
    ctx.fillStyle = '#0F2B4E';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(it.title, it.x + 104, it.y + 24);

    // Deskripsi 2 Baris Abu-abu Rapi
    ctx.fillStyle = '#475569';
    ctx.font = '14.5px sans-serif';
    wrapTextLines(ctx, it.desc, it.x + 70, it.y + 48, 410, 22);
  });

  // 4. BANNER CALLOUT NAVY + BOHLAM KUNING + SAVE (Persis Terang Bulan)
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    t.quote1 || 'Bukan soal punya lahan lebih luas.',
    t.quote2 || 'Tapi bagaimana membuat setiap hektare menghasilkan lebih optimal.',
    'SAVE ➔'
  );

  // 5. Footer Resmi
  renderAgrotechFooter(ctx);
}

// LAYOUT 1: 5-CHECKLIST AUDIT MANDIRI KEBUN (Bersih & Mudah Disimpan)
function renderLayoutChecklist5(ctx, t, photo, customHook) {
  // 1. Foto Hero Atas 38%
  const heroH = 410;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    ctx.fillStyle = '#1A365D';
    ctx.fillRect(0, 0, 1080, heroH);
  }

  // Scrim atas
  const topScrim = ctx.createLinearGradient(0, 0, 0, 220);
  topScrim.addColorStop(0, 'rgba(6, 24, 44, 0.7)');
  topScrim.addColorStop(1, 'rgba(6, 24, 44, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, 1080, 220);

  renderAgrotechLogo(ctx, 815, 24);
  drawOrganicBrushRibbon(ctx, 45, 26, '📋 ' + (t.ribbonText || 'AUDIT LAPANGAN PERKEBUNAN'), '#EAB308', '#0A2540');

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 34px sans-serif';
  wrapTextLines(ctx, customHook || t.headline, 45, 126, 740, 44);
  ctx.restore();

  // 2. Lembar Putih untuk 5 Baris Checklist
  const sheetY = 350;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = -6;
  ctx.beginPath();
  ctx.moveTo(0, sheetY + 32);
  ctx.quadraticCurveTo(0, sheetY, 32, sheetY);
  ctx.lineTo(1080 - 32, sheetY);
  ctx.quadraticCurveTo(1080, sheetY, 1080, sheetY + 32);
  ctx.lineTo(1080, 938);
  ctx.lineTo(0, 938);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. 5 Baris Checklist Terbuka Rapi
  const listItems = t.checklist || [
    { num: '01', title: 'BIAYA PUPUK MEMBENGKAK TANPA KENAIKAN TONASE', desc: 'Pemupukan tanpa sensor menguras anggaran tanpa diiringi kenaikan panen.', tag: 'BIAYA BOROS' },
    { num: '02', title: 'KONDISI TANAH & LENGAS TIDAK PERNAH TERUKUR', desc: 'pH tanah drop atau kelembapan ekstrem memicu stres akar dan layu.', tag: 'BUTA DATA' },
    { num: '03', title: 'SERANGAN HAMA & PENYAKIT SELALU TELAT DIKETAHUI', desc: 'Baru ditangani saat daun kuning meluas, bukan sejak fase deteksi dini.', tag: 'SERANGAN HAMA' },
    { num: '04', title: 'PEMBUKUAN KAS & MANDOR MASIH PAKAI NOTA KERTAS', desc: 'Catatan basah, nota sobek, dan selisih timbangan tidak terlacak.', tag: 'NOTA HILANG' },
    { num: '05', title: 'KESERAGAMAN BUAH RENDAH (GRADE B & C TINGGI)', desc: 'Distribusi air tidak merata menyebabkan ukuran dan bobot buah belang.', tag: 'GRADE BELANG' }
  ];

  let startY = 380;
  listItems.slice(0, 5).forEach((item, idx) => {
    const rowY = startY + idx * 82;

    // Garis pemisah halus
    if (idx > 0) {
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(60, rowY - 10, 960, 1.5);
    }

    // Badge Centang Hijau
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(85, rowY + 22, 20, 0, Math.PI * 2);
    ctx.fill();
    drawVectorIcon(ctx, 85, rowY + 22, 'check', '#FFFFFF');

    // Judul Baris
    ctx.fillStyle = '#0F2B4E';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(`${item.num}. ${item.title}`, 120, rowY + 16);

    // Deskripsi 1 Baris
    ctx.fillStyle = '#64748B';
    ctx.font = '14px sans-serif';
    ctx.fillText(item.desc, 120, rowY + 38);

    // Tag Kanan
    ctx.fillStyle = '#FEF2F2';
    drawRoundRectPath(ctx, 915, rowY + 6, 105, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(item.tag || 'PERIKSA', 925, rowY + 24);
  });

  // 4. Banner Callout Evaluasi
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    '⚠️ Evaluasi Mandiri Kebun Anda:',
    'Jika kebun mengalami minimal 2 dari 5 tanda di atas, segera jadwalkan audit SOP kebun.',
    'SAVE ➔'
  );

  renderAgrotechFooter(ctx);
}

// LAYOUT 2: PERBANDINGAN STRATEGIS 2-KOLOM (Cara Lama vs Solusi Agrotech)
function renderLayoutComparisonVS(ctx, t, photo, customHook) {
  // 1. Foto Hero Atas 34%
  const heroH = 370;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    ctx.fillStyle = '#1E3A2F';
    ctx.fillRect(0, 0, 1080, heroH);
  }

  renderAgrotechLogo(ctx, 815, 24);
  drawOrganicBrushRibbon(ctx, 45, 26, '⚖️ ' + (t.ribbonText || 'PERBANDINGAN STRATEGIS'), '#EAB308', '#0A2540');

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 34px sans-serif';
  wrapTextLines(ctx, customHook || t.headline, 45, 126, 740, 44);
  ctx.restore();

  // 2. Lembar Putih Utama
  const sheetY = 320;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = -6;
  ctx.beginPath();
  ctx.moveTo(0, sheetY + 32);
  ctx.quadraticCurveTo(0, sheetY, 32, sheetY);
  ctx.lineTo(1080 - 32, sheetY);
  ctx.quadraticCurveTo(1080, sheetY, 1080, sheetY + 32);
  ctx.lineTo(1080, 938);
  ctx.lineTo(0, 938);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Dua Kolom Perbandingan Berwarna Lembut
  const cardW = 475;
  const cardH = 435;
  const leftX = 50;
  const rightX = 555;
  const cardY = 350;

  // KOLOM KIRI: CARA LAMA (Soft Red Wash)
  ctx.fillStyle = '#FFF5F5';
  drawRoundRectPath(ctx, leftX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = '#FECDD3';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header Kiri
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(leftX + 42, cardY + 42, 22, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, leftX + 42, cardY + 42, 'cross', '#FFFFFF');

  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('CARA KONVENSIONAL (LAMA)', leftX + 78, cardY + 48);

  // Poin-poin Kiri
  const oldPoints = [
    { t: 'Takaran Pupuk Kira-Kira', d: 'Dosis disebar tanpa uji kesuburan tanah.' },
    { t: 'Penyiraman Manual', d: 'Hanya mengira cuaca, rawan becek & layu.' },
    { t: 'Catatan Mandor Kertas', d: 'Buku basah tercecer, stok kas rawan selisih.' },
    { t: 'Timbangan Pos Manual', d: 'Data tonase panen lambat sampai ke pemilik.' }
  ];

  oldPoints.forEach((p, idx) => {
    const py = cardY + 105 + idx * 64;
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', leftX + 32, py);

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(p.t, leftX + 54, py);

    ctx.fillStyle = '#6B7280';
    ctx.font = '13.5px sans-serif';
    ctx.fillText(p.d, leftX + 54, py + 20);
  });

  // Badge Dampak Kiri
  ctx.fillStyle = '#FEE2E2';
  drawRoundRectPath(ctx, leftX + 24, cardY + cardH - 56, cardW - 48, 38, 10);
  ctx.fill();
  ctx.fillStyle = '#B91C1C';
  ctx.font = 'bold 13.5px sans-serif';
  ctx.fillText('⚠️ Dampak: Biaya Boros & Panen Fluktuatif', leftX + 40, cardY + cardH - 32);

  // KOLOM KANAN: SOLUSI AGROTECH (Soft Emerald Wash)
  ctx.fillStyle = '#F0FDF4';
  drawRoundRectPath(ctx, rightX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = '#BBF7D0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header Kanan
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(rightX + 42, cardY + 42, 22, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, rightX + 42, cardY + 42, 'check', '#FFFFFF');

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SOLUSI CERDAS AGROTECH', rightX + 78, cardY + 48);

  // Poin-poin Kanan
  const newPoints = [
    { t: 'Dosis Presisi Sensor Tanah', d: 'Nutrisi diukur sesuai pH & lengas riil.' },
    { t: 'Fertigasi Solenoid Otomatis', d: 'Katup nutrisi teratur hemat air 35%.' },
    { t: 'Rekapitulasi Cloud di HP', d: 'Absensi mandor & stok pupuk tercatat rapi.' },
    { t: 'Timbangan Pos Terhubung', d: 'Tonase panen masuk dashboard owner seketika.' }
  ];

  newPoints.forEach((p, idx) => {
    const py = cardY + 105 + idx * 64;
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✓', rightX + 32, py);

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(p.t, rightX + 54, py);

    ctx.fillStyle = '#6B7280';
    ctx.font = '13.5px sans-serif';
    ctx.fillText(p.d, rightX + 54, py + 20);
  });

  // Badge Dampak Kanan
  ctx.fillStyle = '#DCFCE7';
  drawRoundRectPath(ctx, rightX + 24, cardY + cardH - 56, cardW - 48, 38, 10);
  ctx.fill();
  ctx.fillStyle = '#15803D';
  ctx.font = 'bold 13.5px sans-serif';
  ctx.fillText('✅ Hasil: Hemat 35% & Panen Seragam Grade A', rightX + 40, cardY + cardH - 32);

  // EMBLEM VS FLOATING DI TENGAH
  const vsX = 540;
  const vsY = cardY + cardH / 2;
  ctx.save();
  ctx.fillStyle = '#F59E0B';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(vsX, vsY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VS', vsX, vsY + 8);
  ctx.textAlign = 'left';
  ctx.restore();

  // 4. Callout Bar
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    'Modernisasi kebun bukan sekadar biaya,',
    'tapi strategi menghentikan kebocoran profit setiap musim panen.',
    'SAVE ➔'
  );

  renderAgrotechFooter(ctx);
}

// LAYOUT 3: BIG STAT ROI & REALITY CHECK (Angka Riil & Solusi Lapangan)
function renderLayoutBigStatROI(ctx, t, photo, customHook) {
  // 1. Foto Hero Atas 38%
  const heroH = 410;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    ctx.fillStyle = '#064E3B';
    ctx.fillRect(0, 0, 1080, heroH);
  }

  renderAgrotechLogo(ctx, 815, 24);
  drawOrganicBrushRibbon(ctx, 45, 26, '📊 ' + (t.ribbonText || 'BUKTI DATA & ROI FINANSIAL'), '#EAB308', '#0A2540');

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 34px sans-serif';
  wrapTextLines(ctx, customHook || t.headline, 45, 126, 740, 44);
  ctx.restore();

  // 2. Lembar Putih Utama
  const sheetY = 350;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = -6;
  ctx.beginPath();
  ctx.moveTo(0, sheetY + 32);
  ctx.quadraticCurveTo(0, sheetY, 32, sheetY);
  ctx.lineTo(1080 - 32, sheetY);
  ctx.quadraticCurveTo(1080, sheetY, 1080, sheetY + 32);
  ctx.lineTo(1080, 938);
  ctx.lineTo(0, 938);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. SECTION ANGKA BESAR (35%)
  ctx.fillStyle = '#0F2B4E';
  ctx.font = 'bold 88px sans-serif';
  ctx.fillText('35%', 60, 450);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PENGHEMATAN BIAYA PUPUK & AIR PER HEKTAR', 290, 410);

  ctx.fillStyle = '#64748B';
  ctx.font = '16px sans-serif';
  ctx.fillText('Terbukti pada audit implementasi kebun hortikultura & perkebunan.', 290, 442);

  // 3 Kotak Metrik Ringkas Sejajar
  const metrics = [
    { val: '+28%', label: 'Kenaikan Tonase Grade A', color: '#10B981' },
    { val: '100%', label: 'Transparansi Stok & Kas', color: '#0284C7' },
    { val: '10 Mnt', label: 'Audit Spasial 50 Ha', color: '#F59E0B' }
  ];

  metrics.forEach((m, idx) => {
    const mx = 60 + idx * 325;
    ctx.fillStyle = '#F8FAFC';
    drawRoundRectPath(ctx, mx, 480, 305, 74, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = m.color;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(m.val, mx + 16, 526);

    ctx.fillStyle = '#334155';
    ctx.font = '13.5px sans-serif';
    ctx.fillText(m.label, mx + 105, 524);
  });

  // 4. Dua Kartu Solusi Lapangan Bawah
  const cardY = 575;
  const cardH = 205;

  // Solusi 1: Fertigasi
  ctx.fillStyle = '#F0F9FF';
  drawRoundRectPath(ctx, 60, cardY, 465, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = '#BAE6FD';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(95, cardY + 38, 22, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, 95, cardY + 38, 'water', '#FFFFFF');

  ctx.fillStyle = '#0369A1';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SMART FERTIGATION PRESISI', 130, cardY + 44);

  ctx.fillStyle = '#334155';
  ctx.font = '14.5px sans-serif';
  wrapTextLines(ctx, 'Pupuk cair terlarut disalurkan langsung ke zona perakaran aktif tanpa menguap sia-sia atau hanyut tergerus hujan deras.', 90, cardY + 84, 410, 24);

  // Solusi 2: Drone NDVI
  ctx.fillStyle = '#F0FDF4';
  drawRoundRectPath(ctx, 555, cardY, 465, cardH, 16);
  ctx.fill();
  ctx.strokeStyle = '#BBF7D0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(590, cardY + 38, 22, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, 590, cardY + 38, 'search', '#FFFFFF');

  ctx.fillStyle = '#15803D';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SENSUS NDVI AERIAL DRONE', 625, cardY + 44);

  ctx.fillStyle = '#334155';
  ctx.font = '14.5px sans-serif';
  wrapTextLines(ctx, 'Kamera multispektral membaca tingkat stres vegetasi dan zonasi defisiensi hara sebelum bercak daun menular ke seluruh blok.', 585, cardY + 84, 410, 24);

  // 5. Callout Bar
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    'Keputusan agribisnis terbaik dilahirkan dari data lapangan presisi,',
    'bukan sekadar firasat atau kebiasaan lama tanpa evaluasi.',
    'SAVE ➔'
  );

  renderAgrotechFooter(ctx);
}

// LAYOUT 4: 3-LANGKAH ROADMAP TRANSFORMASI (Timeline Alur yang Jelas)
function renderLayout3StepsTimeline(ctx, t, photo, customHook) {
  // 1. Foto Hero Atas 32%
  const heroH = 350;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, 1080, heroH);
  }

  renderAgrotechLogo(ctx, 815, 24);
  drawOrganicBrushRibbon(ctx, 45, 26, '🚀 ' + (t.ribbonText || 'ROADMAP TRANSFORMASI KEBUN'), '#EAB308', '#0A2540');

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 34px sans-serif';
  wrapTextLines(ctx, customHook || t.headline, 45, 126, 740, 44);
  ctx.restore();

  // 2. Lembar Putih Utama
  const sheetY = 310;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = -6;
  ctx.beginPath();
  ctx.moveTo(0, sheetY + 32);
  ctx.quadraticCurveTo(0, sheetY, 32, sheetY);
  ctx.lineTo(1080 - 32, sheetY);
  ctx.quadraticCurveTo(1080, sheetY, 1080, sheetY + 32);
  ctx.lineTo(1080, 938);
  ctx.lineTo(0, 938);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Garis Timeline Vertikal
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(105, 360);
  ctx.lineTo(105, 760);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // 4. 3 Kartu Tahapan Rapi
  const steps = [
    {
      num: '01',
      phase: 'FASE 1: SENSUS & DIAGNOSTIK',
      title: 'Pemetaan Drone NDVI & Uji Kesuburan Tanah',
      desc: 'Scan aerial 50 ha, sensus populasi pohon produktif, dan petakan zona kritis yang butuh perbaikan segera.',
      color: '#0F2B4E',
      y: 350
    },
    {
      num: '02',
      phase: 'FASE 2: OTOMASI IOT & SMART FERTIGASI',
      title: 'Instalasi Sensor Lengas & Solenoid Nutrisi',
      desc: 'Katup pengairan nutrisi membuka presisi sesuai kebutuhan riil tanaman, memangkas pemborosan pupuk 35%.',
      color: '#10B981',
      y: 495
    },
    {
      num: '03',
      phase: 'FASE 3: CONTROLLING ERP & PANEN',
      title: 'Integrasi Timbangan Live & Dashboard Finansial HP',
      desc: 'Catatan borongan mandor, rekapitulasi timbangan panen live, dan analisis HPP per kg langsung di genggaman.',
      color: '#F59E0B',
      y: 640
    }
  ];

  steps.forEach(s => {
    // Nomor Lingkaran Besar di Garis Timeline
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(105, s.y + 36, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.num, 105, s.y + 43);
    ctx.textAlign = 'left';

    // Kartu Konten
    ctx.fillStyle = '#F8FAFC';
    drawRoundRectPath(ctx, 155, s.y, 865, 120, 16);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tag Fase
    ctx.fillStyle = s.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(s.phase, 180, s.y + 30);

    // Judul
    ctx.fillStyle = '#0F2B4E';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(s.title, 180, s.y + 58);

    // Deskripsi
    ctx.fillStyle = '#475569';
    ctx.font = '14.5px sans-serif';
    wrapTextLines(ctx, s.desc, 180, s.y + 84, 810, 22);
  });

  // 5. Callout Bar
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    '🤝 Pendampingan Penuh Konsultan Lapangan:',
    'Tim agronomis Agrotech mendampingi kebun hingga seluruh SOP berjalan mandiri.',
    'SAVE ➔'
  );

  renderAgrotechFooter(ctx);
}

// LAYOUT 5: EXECUTIVE EDITORIAL QUOTE (Mewah, Filosofis, Khas Forbes Agribusiness)
function renderLayoutExecutiveQuote(ctx, t, photo, customHook) {
  // 1. Foto Hero Sinematik Mendominasi 72% Kanvas
  const heroH = 740;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.drawImage(photo, 0, 0, 1080, heroH);
  } else {
    ctx.fillStyle = '#0B2545';
    ctx.fillRect(0, 0, 1080, heroH);
  }

  // Scrim sinematik
  const topScrim = ctx.createLinearGradient(0, 0, 0, 240);
  topScrim.addColorStop(0, 'rgba(6, 24, 44, 0.7)');
  topScrim.addColorStop(1, 'rgba(6, 24, 44, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, 1080, 240);

  renderAgrotechLogo(ctx, 815, 24);
  drawOrganicBrushRibbon(ctx, 45, 26, '💡 ' + (t.ribbonText || 'MINDSET AGRIBISNIS MODERN'), '#EAB308', '#0A2540');

  // 2. KARTU FLOATING PUTIH ELEGAN MEWAH (Tengah Bawah)
  const cardX = 55;
  const cardY = 270;
  const cardW = 970;
  const cardH = 515;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // Tanda Petik Emas Besar
  ctx.fillStyle = '#E5A93C';
  ctx.font = 'bold 84px serif';
  ctx.fillText('“', cardX + 45, cardY + 85);

  // Kutipan Utama Besar & Berwibawa
  ctx.fillStyle = '#0A2540';
  ctx.font = 'bold 27px sans-serif';
  const mainQuote = t.mainQuote || 'Kebun yang sukses bukan yang lahannya paling luas, melainkan yang setiap jengkal tanahnya dikelola dengan data yang presisi.';
  wrapTextLines(ctx, mainQuote, cardX + 45, cardY + 125, cardW - 90, 42);

  // Garis Emas Halus
  ctx.fillStyle = '#FDE68A';
  ctx.fillRect(cardX + 45, cardY + 235, cardW - 90, 2);

  // Penjelasan Sub-Kutipan
  ctx.fillStyle = '#475569';
  ctx.font = '16.5px sans-serif';
  const subQuote = t.subQuote || 'Membuka areal baru tanpa sistem hanya melipatgandakan pemborosan. Mulai dengan efisiensi pemupukan, standarisasi SOP budidaya, dan pengawasan berbasis sensor cerdas.';
  wrapTextLines(ctx, subQuote, cardX + 45, cardY + 275, cardW - 90, 28);

  // Bagian Bawah Kartu: Profil Konsultan Agrotech & 3 Tag
  const profileY = cardY + 410;

  // Avatar Konsultan
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(cardX + 75, profileY + 25, 26, 0, Math.PI * 2);
  ctx.fill();
  drawVectorIcon(ctx, cardX + 75, profileY + 25, 'leaf', '#FFFFFF');

  ctx.fillStyle = '#0F2B4E';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Hardadi Nur Aziz', cardX + 115, profileY + 20);

  ctx.fillStyle = '#64748B';
  ctx.font = '14px sans-serif';
  ctx.fillText('Head of Smart Farming & IoT Perkebunan Indonesia', cardX + 115, profileY + 42);

  // 3 Pill Tag Kanan
  const tags = ['📊 Data Driven', '🌱 SOP Terukur', '🛡️ Proteksi Laba'];
  let tagX = cardX + cardW - 355;
  tags.forEach(tg => {
    ctx.fillStyle = '#F0FDF4';
    drawRoundRectPath(ctx, tagX, profileY + 10, 105, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#BBF7D0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(tg, tagX + 10, profileY + 32);
    tagX += 115;
  });

  // 3. Callout Bar Bawah
  drawHumanCalloutBar(
    ctx,
    45,
    804,
    990,
    90,
    'Bukan Luas Lahan yang Menentukan Profit,',
    'Tapi Bagaimana Anda Mengelolanya Secara Presisi.',
    'SAVE ➔'
  );

  renderAgrotechFooter(ctx);
}
// CANVAS BANNER SYNTHESIZER DISPATCHER
function createSynthesizedBanner(hookTitle, subtitle, themeIndex, pillarKey) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // Base canvas clean white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1080, 1080);

  const idx = (typeof themeIndex === 'number') ? themeIndex : 0;
  const t = CONSULTING_THEMES[idx % CONSULTING_THEMES.length];
  const photo = PRELOADED_CONSULTING_IMGS[t.heroIdx % PRELOADED_CONSULTING_IMGS.length];

  const layoutMode = idx % 6;

  switch (layoutMode) {
    case 1:
      renderLayoutChecklist5(ctx, t, photo, hookTitle);
      break;
    case 2:
      renderLayoutComparisonVS(ctx, t, photo, hookTitle);
      break;
    case 3:
      renderLayoutBigStatROI(ctx, t, photo, hookTitle);
      break;
    case 4:
      renderLayout3StepsTimeline(ctx, t, photo, hookTitle);
      break;
    case 5:
      renderLayoutExecutiveQuote(ctx, t, photo, hookTitle);
      break;
    case 0:
    default:
      renderLayoutBento2x2(ctx, t, photo, hookTitle);
      break;
  }

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
      caption: buildConsultingCaption(CONSULTING_THEMES[themeA], themeA)
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
      caption: buildConsultingCaption(CONSULTING_THEMES[themeB], themeB)
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
      caption: buildConsultingCaption(CONSULTING_THEMES[themeC], themeC)
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
    { label: '🌾 Bento 2x2', themeIdx: 0, color: '#EAB308' },
    { label: '📋 5 Checklist', themeIdx: 1, color: '#10B981' },
    { label: '⚖️ VS Perbandingan', themeIdx: 2, color: '#F59E0B' },
    { label: '📊 Big Stat ROI', themeIdx: 3, color: '#0284C7' },
    { label: '🚀 3 Alur Tahap', themeIdx: 4, color: '#8B5CF6' },
    { label: '💡 Quote Mindset', themeIdx: 5, color: '#22C55E' }
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
      currentPreFlightPost.caption = buildConsultingCaption(themeObj, opt.themeIdx);

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
  currentPreFlightPost.caption = buildConsultingCaption(theme, nextThemeIdx);

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

