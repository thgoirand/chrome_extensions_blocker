// Extension Blocker - Background Service Worker

// Au démarrage du navigateur
chrome.runtime.onStartup.addListener(() => {
  enforceBlocklist();
});

// À l'installation/mise à jour de cette extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Pré-charge l'ID fourni à l'installation
    const defaultIds = ['hjkinohfcakdnmkhdjpkejgmjpfmfgpp'];
    chrome.storage.sync.get({ blockedIds: [] }, (data) => {
      const merged = [...new Set([...data.blockedIds, ...defaultIds])];
      chrome.storage.sync.set({ blockedIds: merged }, () => enforceBlocklist());
    });
  } else {
    enforceBlocklist();
  }
});

// Quand une extension est activée (l'utilisateur la réactive manuellement)
chrome.management.onEnabled.addListener((info) => {
  getBlockedIds((blockedIds) => {
    if (blockedIds.includes(info.id)) {
      disableExtension(info.id, info.name);
    }
  });
});

// Quand une extension est installée
chrome.management.onInstalled.addListener((info) => {
  getBlockedIds((blockedIds) => {
    if (blockedIds.includes(info.id)) {
      disableExtension(info.id, info.name);
    }
  });
});

// Vérifie et désactive toutes les extensions de la liste noire
function enforceBlocklist() {
  getBlockedIds((blockedIds) => {
    if (blockedIds.length === 0) return;

    chrome.management.getAll((extensions) => {
      extensions.forEach((ext) => {
        if (blockedIds.includes(ext.id) && ext.enabled) {
          disableExtension(ext.id, ext.name);
        }
      });
    });
  });
}

function disableExtension(id, name) {
  chrome.management.setEnabled(id, false, () => {
    if (chrome.runtime.lastError) {
      console.warn(`[Extension Blocker] Impossible de désactiver "${name || id}": ${chrome.runtime.lastError.message}`);
    } else {
      console.log(`[Extension Blocker] Extension désactivée : "${name || id}" (${id})`);
    }
  });
}

function getBlockedIds(callback) {
  chrome.storage.sync.get({ blockedIds: [] }, (data) => {
    callback(data.blockedIds);
  });
}

// Exposer enforceBlocklist pour que le popup puisse déclencher une vérification
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'enforce') {
    enforceBlocklist();
    sendResponse({ ok: true });
  }
});
