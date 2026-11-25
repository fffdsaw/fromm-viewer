(function () {
  if (typeof window.showDirectoryPicker !== 'function') return;

  const storeName = 'folders';
  const mode = {mode: 'readwrite'};
  const folders = new Map();
  // Default keys stay unchanged; artist overrides use a disjoint structured key.
  const keyFor = (account, artist = '') => artist ? JSON.stringify(['artist', account, String(artist)]) : account;
  const changed = () => window.dispatchEvent(new Event('fromm-save-folder-change'));
  const database = new Promise(resolve => {
    try {
      const request = indexedDB.open('fromm-viewer-save-folders', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, {keyPath: 'account'});
      request.onerror = request.onblocked = () => resolve(null);
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    } catch { resolve(null); }
  });

  async function load(account) {
    const db = await database;
    if (!db) return [];
    return new Promise(resolve => {
      const store = db.transaction(storeName).objectStore(storeName);
      const request = account ? store.get(account) : store.getAll();
      request.onsuccess = () => resolve(account ? [request.result].filter(Boolean) : request.result);
      request.onerror = () => resolve([]);
    }).catch(() => []);
  }

  const ready = load().then(rows => {
    for (const {account, folder} of rows) if (!folders.has(account)) folders.set(account, folder);
    changed();
  });
  let channel;
  try { channel = new BroadcastChannel('fromm-viewer-save-folder'); } catch { /* Per-tab reuse still works. */ }
  if (channel) channel.onmessage = async ({data: account}) => {
    if (typeof account !== 'string' || !account) return;
    const [row] = await load(account);
    if (row) folders.set(account, row.folder);else folders.delete(account);
    changed();
  };

  async function remember(account, folder) {
    if (typeof folder.requestPermission !== 'function') return;
    folders.set(account, folder);
    changed();
    const db = await database;
    if (!db) return;
    const saved = await new Promise(resolve => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.oncomplete = () => resolve(true);
      transaction.onabort = () => resolve(false);
      transaction.objectStore(storeName).put({account, folder});
    }).catch(() => false);
    if (saved) channel?.postMessage(account);
  }

  window.FrommSaveFolder = Object.freeze({
    ready,
    name(account, artist = '') { return folders.get(keyFor(account, artist))?.name || ''; },
    async useDefault(account, artist) {
      if (!artist) return;
      await ready;
      const key = keyFor(account, artist);
      folders.delete(key);changed();
      const db = await database;
      if (db) await new Promise(resolve => {
        const transaction = db.transaction(storeName, 'readwrite');
        transaction.oncomplete = transaction.onabort = resolve;
        transaction.objectStore(storeName).delete(key);
      });
      channel?.postMessage(key);
    },
    async open(account, {change = false, artist = ''} = {}) {
      const key = keyFor(account, artist);
      const remembered = !change && (folders.get(key) || folders.get(account));
      // Call the native API while this Save or Choose button still has user activation.
      if (remembered) {
        if (await remembered.requestPermission(mode) === 'granted') return remembered;
        throw new DOMException('저장 폴더 쓰기 권한을 허용하거나 설정에서 폴더를 다시 선택해주세요.', 'NotAllowedError');
      }
      const folder = await window.showDirectoryPicker(mode);
      await remember(change ? key : account, folder);
      return folder;
    }
  });
})();
