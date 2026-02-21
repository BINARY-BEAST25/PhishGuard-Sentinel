document.addEventListener('DOMContentLoaded', async () => {
  const { deviceId, enabled, lockPassword } = await getStorage(['deviceId', 'enabled', 'lockPassword']);
  
  if (deviceId) {
    showConfigured(deviceId, enabled);
  } else {
    document.getElementById('setup-view').style.display = 'block';
  }

  // Save device ID
  document.getElementById('btn-save').addEventListener('click', async () => {
    const deviceIdInput = document.getElementById('device-id-input').value.trim();
    const password = document.getElementById('lock-password').value;
    const msg = document.getElementById('setup-msg');

    if (!deviceIdInput || deviceIdInput.length < 8) {
      msg.className = 'msg error';
      msg.textContent = 'Please enter a valid Device ID';
      return;
    }

    await chrome.storage.local.set({ deviceId: deviceIdInput, enabled: true, lockPassword: password || null });
    msg.className = 'msg success';
    msg.textContent = 'Sentinel installed and active.';
    setTimeout(() => showConfigured(deviceIdInput, true), 800);
  });
});

function showConfigured(deviceId, enabled) {
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('configured-view').style.display = 'block';
  document.getElementById('device-id-display').textContent = deviceId.slice(0, 12) + '...';

  const toggle = document.getElementById('toggle-enabled');
  toggle.checked = enabled !== false;

  toggle.addEventListener('change', async () => {
    const { lockPassword } = await getStorage(['lockPassword']);
    if (lockPassword && !toggle.checked) {
      const input = prompt('Enter parent password to disable filtering:');
      if (input !== lockPassword) {
        toggle.checked = true;
        setMsg('Incorrect password', 'error');
        return;
      }
    }
    await chrome.storage.local.set({ enabled: toggle.checked });
    setMsg(toggle.checked ? 'Filtering enabled' : 'Filtering disabled', toggle.checked ? 'success' : 'error');
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    const { lockPassword } = await getStorage(['lockPassword']);
    if (lockPassword) {
      const input = prompt('Enter parent password to reset:');
      if (input !== lockPassword) { setMsg('Incorrect password', 'error'); return; }
    }
    await chrome.storage.local.clear();
    location.reload();
  });
}

function setMsg(text, type) {
  const el = document.getElementById('status-msg');
  el.className = `msg ${type}`;
  el.textContent = text;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
