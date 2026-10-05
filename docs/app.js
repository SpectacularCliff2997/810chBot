// 810ch API Control Panel Application Logic

(() => {
  'use strict';

  // --- State & Storage ---
  const STORAGE_KEYS = {
    BASE_URL: '810ch_base_url',
    SLUG: '810ch_slug',
    API_KEY: '810ch_api_key',
    AUTH_TYPE: '810ch_auth_type',
    CORS_PRESET: '810ch_cors_preset',
    CORS_PROXY: '810ch_cors_proxy',
    THEME: '810ch_theme',
    HISTORY: '810ch_history'
  };

  const state = {
    baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL) || 'https://810ch.yajuvideo.st/api/v1',
    slug: localStorage.getItem(STORAGE_KEYS.SLUG) || 'miichan',
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    authType: localStorage.getItem(STORAGE_KEYS.AUTH_TYPE) || 'bearer',
    corsPreset: localStorage.getItem(STORAGE_KEYS.CORS_PRESET) || 'none',
    corsProxy: localStorage.getItem(STORAGE_KEYS.CORS_PROXY) || '',
    theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
    history: JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]'),
    activeCountdownInterval: null,
    lastTarget: null
  };

  // --- DOM Elements ---
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Initializer ---
  function init() {
    applyTheme(state.theme);
    syncConfigToUI();
    updateStatusIndicators();
    setupEventListeners();
    renderHistory();
  }

  // --- Theme ---
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  // --- UI Sync & Config ---
  function syncConfigToUI() {
    $('cfg-base-url').value = state.baseUrl;
    $('cfg-slug').value = state.slug;
    $('cfg-api-key').value = state.apiKey;
    $('cfg-auth-type').value = state.authType;
    $('cfg-cors-preset').value = state.corsPreset;
    $('cfg-cors-proxy').value = state.corsProxy;
    $('label-current-slug').textContent = state.slug || 'miichan';

    updateCorsPresetUI();
  }

  function updateCorsPresetUI() {
    const preset = $('cfg-cors-preset').value;
    const customWrap = $('wrap-cors-custom');
    if (preset === 'custom') {
      customWrap.style.display = 'flex';
    } else {
      customWrap.style.display = 'none';
      if (preset === 'localhost') {
        $('cfg-cors-proxy').value = 'http://localhost:8080/?url=';
      } else if (preset === 'none') {
        $('cfg-cors-proxy').value = '';
      }
    }
  }

  function saveConfigFromUI() {
    state.baseUrl = $('cfg-base-url').value.trim().replace(/\/+$/, '');
    state.slug = $('cfg-slug').value.trim() || 'miichan';
    state.apiKey = $('cfg-api-key').value.trim();
    state.authType = $('cfg-auth-type').value;
    state.corsPreset = $('cfg-cors-preset').value;
    
    if (state.corsPreset === 'localhost') {
      state.corsProxy = 'http://localhost:8080/?url=';
    } else if (state.corsPreset === 'none') {
      state.corsProxy = '';
    } else {
      state.corsProxy = $('cfg-cors-proxy').value.trim();
    }

    localStorage.setItem(STORAGE_KEYS.BASE_URL, state.baseUrl);
    localStorage.setItem(STORAGE_KEYS.SLUG, state.slug);
    localStorage.setItem(STORAGE_KEYS.API_KEY, state.apiKey);
    localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, state.authType);
    localStorage.setItem(STORAGE_KEYS.CORS_PRESET, state.corsPreset);
    localStorage.setItem(STORAGE_KEYS.CORS_PROXY, state.corsProxy);

    updateStatusIndicators();
    $('config-drawer').classList.add('hidden');
    $('config-caret').textContent = '▼';
  }

  function updateStatusIndicators() {
    $('label-current-slug').textContent = state.slug || 'miichan';
    const dotAuth = $('dot-auth');
    const labelAuth = $('label-auth-status');

    if (state.apiKey) {
      dotAuth.className = 'status-dot active';
      labelAuth.textContent = `Key設定済 (${state.apiKey.slice(0, 10)}…)`;
    } else {
      dotAuth.className = 'status-dot warn';
      labelAuth.textContent = 'Key未設定';
    }
  }

  // --- Request Engine ---
  function buildRequestData(target) {
    const slug = encodeURIComponent(state.slug || 'miichan');
    let method = 'GET';
    let path = '';
    let body = null;
    let contentType = null;

    switch (target) {
      case 'get-board':
        method = 'GET';
        path = `/boards/${slug}`;
        break;

      case 'get-board-responses': {
        method = 'GET';
        const startAt = $('input-board-start-at').value.trim();
        path = `/boards/${slug}/responses` + (startAt ? `?start_at=${encodeURIComponent(startAt)}` : '');
        break;
      }

      case 'get-threads': {
        method = 'GET';
        const page = $('input-threads-page').value.trim() || '1';
        const perPage = $('input-threads-per-page').value.trim() || '20';
        path = `/boards/${slug}/threads?page=${page}&per_page=${perPage}`;
        break;
      }

      case 'get-thread-detail': {
        method = 'GET';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        const page = $('input-thread-page').value.trim() || '1';
        const perPage = $('input-thread-per-page').value.trim() || '20';
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}?page=${page}&per_page=${perPage}`;
        break;
      }

      case 'post-forcesage': {
        method = 'POST';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/force_sage`;
        break;
      }

      case 'delete-forcesage': {
        method = 'DELETE';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/force_sage`;
        break;
      }

      case 'post-threadstop': {
        method = 'POST';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/threadstop`;
        break;
      }

      case 'delete-threadstop': {
        method = 'DELETE';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/threadstop`;
        break;
      }

      case 'delete-thread': {
        method = 'DELETE';
        const tKey = $('input-thread-key').value.trim();
        if (!tKey) throw new Error('スレッドキー(thread_key)を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}`;
        break;
      }

      case 'get-single-res': {
        method = 'GET';
        const tKey = $('input-res-thread-key').value.trim();
        const num = $('input-res-number').value.trim();
        if (!tKey || !num) throw new Error('スレッドキーとレス番号を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/responses/${encodeURIComponent(num)}`;
        break;
      }

      case 'aborn-res': {
        method = 'POST';
        const tKey = $('input-res-thread-key').value.trim();
        const num = $('input-res-number').value.trim();
        const reason = $('input-res-reason').value.trim();
        if (!tKey || !num) throw new Error('スレッドキーとレス番号を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/responses/${encodeURIComponent(num)}/aborn`;
        if (reason) {
          body = new URLSearchParams({ reason }).toString();
          contentType = 'application/x-www-form-urlencoded';
        }
        break;
      }

      case 'delete-transparent-res': {
        method = 'DELETE';
        const tKey = $('input-res-thread-key').value.trim();
        const num = $('input-res-number').value.trim();
        if (!tKey || !num) throw new Error('スレッドキーとレス番号を入力してください');
        path = `/boards/${slug}/threads/${encodeURIComponent(tKey)}/responses/${encodeURIComponent(num)}`;
        break;
      }

      case 'get-post-keys':
        method = 'GET';
        path = `/boards/${slug}/post_keys`;
        break;

      case 'get-key-writings': {
        method = 'GET';
        const pubId = $('input-public-id').value.trim();
        if (!pubId) throw new Error('認証キーID(public_id)を入力してください');
        path = `/boards/${slug}/post_keys/${encodeURIComponent(pubId)}/writings`;
        break;
      }

      case 'delete-key': {
        method = 'DELETE';
        const pubId = $('input-public-id').value.trim();
        if (!pubId) throw new Error('認証キーID(public_id)を入力してください');
        path = `/boards/${slug}/post_keys/${encodeURIComponent(pubId)}`;
        break;
      }

      case 'aborn-all-key': {
        method = 'POST';
        const pubId = $('input-public-id').value.trim();
        if (!pubId) throw new Error('認証キーID(public_id)を入力してください');
        path = `/boards/${slug}/post_keys/${encodeURIComponent(pubId)}/aborn_all`;
        break;
      }

      case 'raw-exec': {
        method = $('raw-method').value;
        let rawP = $('raw-path').value.trim();
        rawP = rawP.replace(/\{slug\}/g, encodeURIComponent(state.slug || 'miichan'));
        path = rawP.startsWith('/') ? rawP : `/${rawP}`;
        const rawBodyText = $('raw-body').value.trim();
        if (rawBodyText && method !== 'GET' && method !== 'HEAD') {
          body = rawBodyText;
          contentType = rawBodyText.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded';
        }
        break;
      }

      default:
        throw new Error('不明なアクションです: ' + target);
    }

    const fullUrl = path.startsWith('http') ? path : `${state.baseUrl}${path}`;
    return { method, path, fullUrl, body, contentType };
  }

  function generateCurlCommand(reqData) {
    const key = state.apiKey || '$KEY';
    const header = state.authType === 'header'
      ? `-H "X-API-Key: ${key}"`
      : `-H "Authorization: Bearer ${key}"`;

    let cmd = ['curl'];
    if (reqData.method !== 'GET') {
      cmd.push(`-X ${reqData.method}`);
    }
    cmd.push(header);

    if (reqData.body) {
      if (reqData.contentType === 'application/json') {
        cmd.push(`-H "Content-Type: application/json"`);
      }
      cmd.push(`-d "${reqData.body.replace(/"/g, '\\"')}"`);
    }

    cmd.push(`"${reqData.fullUrl}"`);
    return cmd.join(' ');
  }

  async function executeRequest(target) {
    let reqData;
    try {
      reqData = buildRequestData(target);
    } catch (err) {
      alert(err.message);
      return;
    }

    state.lastTarget = target;

    // Update Meta Box
    $('meta-url').textContent = reqData.fullUrl;
    $('meta-method').textContent = reqData.method;
    $('resp-status').className = 'status-badge';
    $('resp-status').textContent = 'REQUESTING...';
    $('resp-time').textContent = '-- ms';
    $('resp-viewer').textContent = 'Loading...';
    $('ratelimit-banner').classList.add('hidden');
    $('cors-banner').classList.add('hidden');

    if (state.activeCountdownInterval) {
      clearInterval(state.activeCountdownInterval);
      state.activeCountdownInterval = null;
    }

    // Prepare Fetch
    const headers = {};
    if (state.apiKey) {
      if (state.authType === 'header') {
        headers['X-API-Key'] = state.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${state.apiKey}`;
      }
    }
    if (reqData.contentType) {
      headers['Content-Type'] = reqData.contentType;
    }

    let fetchUrl = reqData.fullUrl;
    if (state.corsProxy) {
      const p = state.corsProxy.trim();
      if (p.endsWith('=')) {
        fetchUrl = `${p}${encodeURIComponent(reqData.fullUrl)}`;
      } else if (p.endsWith('?')) {
        fetchUrl = `${p}${encodeURIComponent(reqData.fullUrl)}`;
      } else {
        fetchUrl = `${p.replace(/\/+$/, '')}/${encodeURIComponent(reqData.fullUrl)}`;
      }
    }

    const fetchOptions = {
      method: reqData.method,
      headers
    };
    if (reqData.body && reqData.method !== 'GET' && reqData.method !== 'HEAD') {
      fetchOptions.body = reqData.body;
    }

    const startTime = performance.now();
    let statusText = '';
    let isError = false;
    let responseText = '';

    try {
      const res = await fetch(fetchUrl, fetchOptions);
      const elapsed = Math.round(performance.now() - startTime);
      $('resp-time').textContent = `${elapsed} ms`;

      // Badge status
      const statusBadge = $('resp-status');
      statusBadge.textContent = `${res.status} ${res.statusText || ''}`;
      if (res.status >= 200 && res.status < 300) {
        statusBadge.className = 'status-badge s2xx';
      } else if (res.status >= 400 && res.status < 500) {
        statusBadge.className = 'status-badge s4xx';
      } else {
        statusBadge.className = 'status-badge s5xx';
      }

      // Check Rate Limit 429
      if (res.status === 429) {
        handleRateLimit429(res);
      }

      responseText = await res.text();

      // JSON formatting attempt
      try {
        const json = JSON.parse(responseText);
        $('resp-viewer').textContent = JSON.stringify(json, null, 2);
      } catch {
        $('resp-viewer').textContent = responseText || '(Empty Response Body)';
      }

      addHistoryItem({
        method: reqData.method,
        path: reqData.path,
        status: res.status,
        time: new Date().toLocaleTimeString(),
        response: responseText
      });

    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      $('resp-time').textContent = `${elapsed} ms`;
      $('resp-status').className = 'status-badge s5xx';
      $('resp-status').textContent = 'NETWORK / CORS ERROR';

      $('cors-banner').classList.remove('hidden');

      const errorGuide = [
        `[エラー] リクエストに失敗しました: ${err.message}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '【原因: ブラウザのCORS制限 (Cross-Origin Request Blocked)】',
        '810ch APIサーバーは、ブラウザ(GitHub Pages)からの直接通信に必要な',
        'CORS許可ヘッダー(Access-Control-Allow-Origin)を返さないため遮断されました。',
        '',
        '【解決方法（いずれか1つを選択）】',
        '方法 1. 同梱のローカルTorプロキシを起動する（安全・Tor強制・推奨）',
        '   TorまたはTor Browserを起動した状態で、ターミナルで以下を実行:',
        '   $ node proxy.js',
        '   ※すべてのAPI通信がTorネットワーク(127.0.0.1:9150/9050)を必ず経由します。',
        '   ※または上の「🧅 ローカルTorプロキシを適用して再試行」ボタンをクリック',
        '',
        '方法 2. cURLコマンドをターミナルで実行する',
        '   各フォームの [cURLコピー] をクリックしてターミナルで叩けば、',
        '   CORSの制約を一切受けずに直接APIを実行できます。',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      ].join('\n');

      $('resp-viewer').textContent = errorGuide;
    }
  }

  function handleRateLimit429(response) {
    const banner = $('ratelimit-banner');
    const countdownEl = $('ratelimit-countdown');
    banner.classList.remove('hidden');

    const retryAfter = response.headers.get('Retry-After');
    let secondsLeft = retryAfter ? parseInt(retryAfter, 10) : 60;

    countdownEl.textContent = `再試行可能まで ${secondsLeft} 秒`;

    state.activeCountdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(state.activeCountdownInterval);
        state.activeCountdownInterval = null;
        banner.classList.add('hidden');
      } else {
        countdownEl.textContent = `再試行可能まで ${secondsLeft} 秒`;
      }
    }, 1000);
  }

  // --- Confirm Modal ---
  function showConfirm(title, desc, onConfirm) {
    const modal = $('confirm-modal');
    $('modal-title').textContent = title;
    $('modal-desc').textContent = desc;
    modal.classList.remove('hidden');

    const cancelBtn = $('btn-modal-cancel');
    const confirmBtn = $('btn-modal-confirm');

    const cleanup = () => {
      modal.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onOk);
    };

    const onCancel = () => cleanup();
    const onOk = () => {
      cleanup();
      onConfirm();
    };

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onOk);
  }

  // --- History Management ---
  function addHistoryItem(item) {
    state.history.unshift(item);
    if (state.history.length > 20) state.history.pop();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    const list = $('history-list');
    list.innerHTML = '';
    if (state.history.length === 0) {
      list.innerHTML = '<div style="color:var(--text-dim); padding:4px;">履歴はありません</div>';
      return;
    }

    state.history.forEach((h, idx) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
          <span class="badge-method ${h.method.toLowerCase()}">${h.method}</span>
          <span style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${h.path}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <span style="color:${h.status >= 200 && h.status < 300 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">${h.status}</span>
          <span style="color:var(--text-dim); font-size:10px;">${h.time}</span>
        </div>
      `;
      el.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(h.response);
          $('resp-viewer').textContent = JSON.stringify(parsed, null, 2);
        } catch {
          $('resp-viewer').textContent = h.response || '(Empty Body)';
        }
        $('resp-status').textContent = `STATUS: ${h.status}`;
        $('meta-url').textContent = h.path;
        $('meta-method').textContent = h.method;
      });
      list.appendChild(el);
    });
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Theme toggle
    $('btn-toggle-theme').addEventListener('click', toggleTheme);

    // Config Drawer Toggle
    $('btn-toggle-config').addEventListener('click', () => {
      const drawer = $('config-drawer');
      const isHidden = drawer.classList.toggle('hidden');
      $('config-caret').textContent = isHidden ? '▼' : '▲';
    });

    $('btn-save-config').addEventListener('click', saveConfigFromUI);

    $('btn-clear-key').addEventListener('click', () => {
      $('cfg-api-key').value = '';
      saveConfigFromUI();
    });

    $('btn-toggle-key-visibility').addEventListener('click', () => {
      const inp = $('cfg-api-key');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // CORS Preset change
    $('cfg-cors-preset').addEventListener('change', updateCorsPresetUI);

    // Quick-fix CORS button
    $('btn-quick-fix-cors').addEventListener('click', () => {
      state.corsPreset = 'localhost';
      state.corsProxy = 'http://localhost:8080/?url=';
      localStorage.setItem(STORAGE_KEYS.CORS_PRESET, 'localhost');
      localStorage.setItem(STORAGE_KEYS.CORS_PROXY, 'http://localhost:8080/?url=');
      syncConfigToUI();
      $('cors-banner').classList.add('hidden');
      if (state.lastTarget) {
        executeRequest(state.lastTarget);
      }
    });

    // Navigation Tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        if ($(targetId)) $(targetId).classList.add('active');
      });
    });

    // Hints Toggle
    $$('.btn-hint').forEach(btn => {
      btn.addEventListener('click', () => {
        const hintId = btn.getAttribute('data-hint');
        const box = $(hintId);
        if (box) {
          const isHidden = box.classList.toggle('hidden');
          btn.classList.toggle('active', !isHidden);
        }
      });
    });

    // Current UNIX button
    $('btn-set-now-unix').addEventListener('click', () => {
      $('input-board-start-at').value = Math.floor(Date.now() / 1000);
    });

    // cURL Copy Buttons
    $$('.btn-copy-curl').forEach(btn => {
      btn.addEventListener('click', async () => {
        const target = btn.getAttribute('data-target');
        try {
          const reqData = buildRequestData(target);
          const curl = generateCurlCommand(reqData);
          await navigator.clipboard.writeText(curl);
          const origText = btn.textContent;
          btn.textContent = 'コピー完了!';
          setTimeout(() => { btn.textContent = origText; }, 1500);
        } catch (err) {
          alert('cURL生成失敗: ' + err.message);
        }
      });
    });

    // Copy Response Viewer
    $('btn-copy-resp').addEventListener('click', async () => {
      const text = $('resp-viewer').textContent;
      await navigator.clipboard.writeText(text);
      const btn = $('btn-copy-resp');
      btn.textContent = '済!';
      setTimeout(() => { btn.textContent = 'コピー'; }, 1200);
    });

    $('btn-clear-resp').addEventListener('click', () => {
      $('resp-viewer').textContent = '// 表示クリア済み';
      $('resp-status').className = 'status-badge';
      $('resp-status').textContent = 'READY';
      $('resp-time').textContent = '-- ms';
      $('meta-url').textContent = '-';
      $('meta-method').textContent = '-';
    });

    $('btn-clear-history').addEventListener('click', () => {
      state.history = [];
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      renderHistory();
    });

    // Direct Action Execution Bindings
    // 1. Board
    $('btn-get-board').addEventListener('click', () => executeRequest('get-board'));
    $('btn-get-board-responses').addEventListener('click', () => executeRequest('get-board-responses'));

    // 2. Threads
    $('btn-get-threads').addEventListener('click', () => executeRequest('get-threads'));
    $('btn-get-thread-detail').addEventListener('click', () => executeRequest('get-thread-detail'));

    $('btn-post-forcesage').addEventListener('click', () => {
      const key = $('input-thread-key').value.trim();
      showConfirm(
        '強制sageの有効化',
        `スレッド [${key}] を強制sage（レスされても上がらない状態）にしますか？`,
        () => executeRequest('post-forcesage')
      );
    });

    $('btn-delete-forcesage').addEventListener('click', () => {
      const key = $('input-thread-key').value.trim();
      showConfirm(
        '強制sageの解除',
        `スレッド [${key}] の強制sageを解除しますか？`,
        () => executeRequest('delete-forcesage')
      );
    });

    $('btn-post-threadstop').addEventListener('click', () => {
      const key = $('input-thread-key').value.trim();
      showConfirm(
        'スレスト（書き込み停止）の有効化',
        `スレッド [${key}] をスレスト状態（新規書き込み禁止）にしますか？`,
        () => executeRequest('post-threadstop')
      );
    });

    $('btn-delete-threadstop').addEventListener('click', () => {
      const key = $('input-thread-key').value.trim();
      showConfirm(
        'スレスト解除',
        `スレッド [${key}] のスレストを解除して書き込みを再開可能にしますか？`,
        () => executeRequest('delete-threadstop')
      );
    });

    $('btn-delete-thread').addEventListener('click', () => {
      const key = $('input-thread-key').value.trim();
      showConfirm(
        '⚠️ スレッドの完全削除',
        `警告: スレッド [${key}] およびその配下の全レスが削除されます。この操作は取り消せません。実行しますか？`,
        () => executeRequest('delete-thread')
      );
    });

    // 3. Responses
    $('btn-get-single-res').addEventListener('click', () => executeRequest('get-single-res'));

    $('btn-aborn-res').addEventListener('click', () => {
      const tKey = $('input-res-thread-key').value.trim();
      const num = $('input-res-number').value.trim();
      const reason = $('input-res-reason').value.trim() || '未指定';
      showConfirm(
        'レス通常削除 (aborn)',
        `スレッド [${tKey}] のレス #${num} を通常削除（あぼーんで上書き、理由: ${reason}）しますか？`,
        () => executeRequest('aborn-res')
      );
    });

    $('btn-delete-transparent-res').addEventListener('click', () => {
      const tKey = $('input-res-thread-key').value.trim();
      const num = $('input-res-number').value.trim();
      showConfirm(
        '⚠️ レスの透明削除 (番号繰り上げ)',
        `警告: スレッド [${tKey}] のレス #${num} を透明削除します。以降のレス番号が繰り上がり、削除の痕跡が残りません。実行しますか？`,
        () => executeRequest('delete-transparent-res')
      );
    });

    // 4. Post Keys
    $('btn-get-post-keys').addEventListener('click', () => executeRequest('get-post-keys'));
    $('btn-get-key-writings').addEventListener('click', () => executeRequest('get-key-writings'));

    $('btn-delete-key').addEventListener('click', () => {
      const pubId = $('input-public-id').value.trim();
      showConfirm(
        '認証キーの無効化',
        `認証キー [${pubId}] を無効化しますか？以降このキーによる新規書き込みができなくなります（過去の紐付けは保持）。`,
        () => executeRequest('delete-key')
      );
    });

    $('btn-aborn-all-key').addEventListener('click', () => {
      const pubId = $('input-public-id').value.trim();
      showConfirm(
        '⚠️ 全書き込み通常削除 (aborn_all)',
        `警告: 認証キー [${pubId}] で投稿された板内のすべての書き込みを一括で通常削除（あぼーん）します。実行しますか？`,
        () => executeRequest('aborn-all-key')
      );
    });

    // 5. Raw console
    $('btn-exec-raw').addEventListener('click', () => executeRequest('raw-exec'));
  }

  // Run initial setup on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
