const state = {
  user: JSON.parse(localStorage.getItem('cs_user') || 'null'),
  locations: JSON.parse(localStorage.getItem('cs_locations') || '[]'),
  orders: JSON.parse(localStorage.getItem('cs_orders') || '[]'),
  returns: JSON.parse(localStorage.getItem('cs_returns') || '[]'),
  deferredPrompt: null,
  scannerStream: null,
  scannerInterval: null,
};

const $ = (id) => document.getElementById(id);
const save = () => {
  localStorage.setItem('cs_user', JSON.stringify(state.user));
  localStorage.setItem('cs_locations', JSON.stringify(state.locations));
  localStorage.setItem('cs_orders', JSON.stringify(state.orders));
  localStorage.setItem('cs_returns', JSON.stringify(state.returns));
};

function routeBranchByZip(zip) {
  const z = String(zip || '');
  if (/^(43|44)/.test(z)) return 'Columbus';
  if (/^(45)/.test(z)) return 'Cincinnati';
  if (/^(46|47)/.test(z)) return 'Indianapolis';
  if (/^(40|41)/.test(z)) return 'Louisville';
  return 'Cleveland';
}

function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 2400);
}

function fmtDate(d) {
  return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function setView() {
  $('loginView').classList.toggle('active', !state.user);
  $('portalView').classList.toggle('active', !!state.user);
  if (state.user) {
    $('welcomeText').textContent = state.user.name;
    $('subWelcome').textContent = `${state.user.business} • ${state.user.branch} branch`;
  }
  renderAll();
}

function renderLocationSelects() {
  const selects = [$('orderLocation'), $('returnLocation')];
  selects.forEach(select => {
    select.innerHTML = '';
    const locations = state.locations.length ? state.locations : [{ name: state.user?.business || 'Default Business', address: '', city: '', state: '', zip: '', branch: state.user?.branch || 'Columbus' }];
    locations.forEach((loc, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `${loc.name} • ${loc.branch}`;
      select.appendChild(option);
    });
  });
}

function renderLocations() {
  $('savedLocations').innerHTML = state.locations.length ? '' : '<p class="muted">No saved locations yet.</p>';
  state.locations.forEach((loc, idx) => {
    const el = document.createElement('div');
    el.className = 'location-item';
    el.innerHTML = `
      <div class="row-between">
        <strong>${loc.name}</strong>
        <span class="badge open">${loc.branch}</span>
      </div>
      <div class="muted">${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}</div>
      <button class="ghost mt8" data-delete-location="${idx}">Delete</button>
    `;
    $('savedLocations').appendChild(el);
  });
}

function renderRecentActivity() {
  const items = [
    ...state.orders.map(o => ({ type: 'Order', title: `${o.product} x${o.qty}`, when: o.createdAt, status: o.status, location: o.locationName })),
    ...state.returns.map(r => ({ type: 'Return', title: `${r.product} • ${r.reason}`, when: r.createdAt, status: 'Return Submitted', location: r.locationName }))
  ].sort((a,b)=> new Date(b.when) - new Date(a.when)).slice(0,6);

  $('recentActivity').innerHTML = items.length ? '' : '<p class="muted">No activity yet.</p>';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = `
      <div class="row-between">
        <strong>${item.type}: ${item.title}</strong>
        <span class="badge ${item.type === 'Order' ? 'open' : 'return'}">${item.status}</span>
      </div>
      <div class="muted">${item.location} • ${fmtDate(item.when)}</div>
    `;
    $('recentActivity').appendChild(el);
  });
}

function renderTracking() {
  $('trackingList').innerHTML = state.orders.length ? '' : '<p class="muted">No orders yet.</p>';
  state.orders.slice().reverse().forEach(order => {
    const cls = order.status === 'Delivered' ? 'delivered' : order.status === 'Processing' ? 'processing' : 'open';
    const el = document.createElement('div');
    el.className = 'tracking-item';
    el.innerHTML = `
      <div class="row-between">
        <strong>${order.product} x${order.qty}</strong>
        <span class="badge ${cls}">${order.status}</span>
      </div>
      <div class="muted">Order #${order.id} • ${order.locationName} • ${order.branch}</div>
      <div class="muted">Needed by ${order.needBy}</div>
    `;
    $('trackingList').appendChild(el);
  });
}

function renderCounts() {
  $('openOrdersCount').textContent = state.orders.length;
  $('returnCount').textContent = state.returns.length;
  $('locationCount').textContent = state.locations.length || (state.user ? 1 : 0);
}

function renderAll() {
  renderLocationSelects();
  renderLocations();
  renderRecentActivity();
  renderTracking();
  renderCounts();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabId));
}

$('defaultBranch').addEventListener('change', e => {
  $('customBranchWrap').classList.toggle('hidden', e.target.value !== 'Custom');
});

$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const branch = $('defaultBranch').value === 'Custom' ? ($('customBranch').value || 'Custom') : $('defaultBranch').value;
  state.user = {
    name: $('userName').value.trim(),
    business: $('businessName').value.trim(),
    email: $('userEmail').value.trim(),
    branch,
  };
  if (!state.locations.length) {
    state.locations.push({ name: state.user.business, address: 'Primary Account', city: '', state: '', zip: '', branch });
  }
  save();
  setView();
  showToast('Welcome to Chadwell Supply Mobile');
});

$('logoutBtn').addEventListener('click', () => {
  state.user = null;
  save();
  setView();
});

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
document.querySelectorAll('.action-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.jump)));

document.addEventListener('click', (e) => {
  const idx = e.target.dataset.deleteLocation;
  if (idx !== undefined) {
    state.locations.splice(Number(idx), 1);
    save();
    renderAll();
    showToast('Location removed');
  }
});

$('locationForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const zip = $('locationZip').value.trim();
  const selectedBranch = $('locationBranch').value;
  const branch = selectedBranch === 'Auto-route by ZIP' ? routeBranchByZip(zip) : selectedBranch;
  state.locations.push({
    name: $('locationName').value.trim(),
    address: $('locationAddress').value.trim(),
    city: $('locationCity').value.trim(),
    state: $('locationState').value.trim(),
    zip,
    branch,
  });
  e.target.reset();
  save();
  renderAll();
  showToast(`Location saved and routed to ${branch}`);
});

$('orderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const loc = state.locations[$('orderLocation').value] || state.locations[0] || { name: state.user.business, branch: state.user.branch };
  const order = {
    id: `ORD-${Math.floor(Math.random() * 900000 + 100000)}`,
    locationName: loc.name,
    branch: loc.branch,
    contact: $('orderContact').value.trim(),
    sku: $('orderSku').value.trim(),
    product: $('orderProduct').value.trim(),
    qty: $('orderQty').value,
    needBy: $('orderDate').value,
    priority: $('orderPriority').value,
    notes: $('orderNotes').value.trim(),
    status: 'Submitted',
    createdAt: new Date().toISOString(),
  };
  state.orders.push(order);
  save();
  renderAll();
  cycleStatuses();
  e.target.reset();
  renderLocationSelects();
  showToast(`Order ${order.id} submitted`);
  switchTab('trackingTab');
});

$('returnPhotos').addEventListener('change', async (e) => {
  $('photoPreview').innerHTML = '';
  [...e.target.files].slice(0,6).forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    $('photoPreview').appendChild(img);
  });
});

$('returnForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const loc = state.locations[$('returnLocation').value] || state.locations[0] || { name: state.user.business, branch: state.user.branch };
  const files = [...$('returnPhotos').files].slice(0, 4);
  const photoNames = files.map(f => f.name);
  const entry = {
    id: `RET-${Math.floor(Math.random() * 900000 + 100000)}`,
    locationName: loc.name,
    branch: loc.branch,
    orderNumber: $('returnOrderNumber').value.trim(),
    sku: $('returnSku').value.trim(),
    product: $('returnProduct').value.trim(),
    reason: $('returnReason').value,
    description: $('returnDescription').value.trim(),
    photoNames,
    createdAt: new Date().toISOString(),
  };
  state.returns.push(entry);
  save();
  renderAll();
  e.target.reset();
  $('photoPreview').innerHTML = '';
  showToast(`Return report ${entry.id} submitted`);
});

function cycleStatuses() {
  state.orders.forEach((o, index) => {
    const age = Date.now() - new Date(o.createdAt).getTime();
    if (age > 20000) o.status = 'Delivered';
    else if (age > 8000) o.status = 'Processing';
    else o.status = 'Submitted';
  });
  save();
  renderTracking();
  renderRecentActivity();
}
setInterval(cycleStatuses, 4000);

$('exportDataBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ user: state.user, locations: state.locations, orders: state.orders, returns: state.returns }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chadwell-mobile-demo-data.json';
  a.click();
  showToast('Data exported');
});

async function startScanner() {
  $('scannerModal').classList.remove('hidden');
  const video = $('scannerVideo');
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera scanning not supported on this device');
    return;
  }
  try {
    state.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = state.scannerStream;

    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      state.scannerInterval = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            $('orderSku').value = codes[0].rawValue;
            stopScanner();
            showToast(`Scanned SKU ${codes[0].rawValue}`);
          }
        } catch (_) {}
      }, 900);
    }
  } catch (err) {
    showToast('Unable to access camera');
  }
}

function stopScanner() {
  clearInterval(state.scannerInterval);
  if (state.scannerStream) state.scannerStream.getTracks().forEach(t => t.stop());
  state.scannerStream = null;
  $('scannerModal').classList.add('hidden');
}
$('scanSkuBtn').addEventListener('click', startScanner);
$('closeScannerBtn').addEventListener('click', stopScanner);
$('useManualSkuBtn').addEventListener('click', () => {
  $('orderSku').value = $('manualSku').value.trim();
  stopScanner();
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  $('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  $('installBtn').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

setView();
$('orderDate').valueAsDate = new Date();
