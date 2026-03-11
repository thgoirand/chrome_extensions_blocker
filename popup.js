// Extension Blocker - Popup Script

const input    = document.getElementById('newId');
const btnAdd   = document.getElementById('btnAdd');
const errorMsg = document.getElementById('errorMsg');
const listContainer = document.getElementById('listContainer');
const countEl  = document.getElementById('count');
const btnEnforce = document.getElementById('btnEnforce');

// Validation : un ID Chrome fait exactement 32 caractères alphanumériques
function isValidExtensionId(id) {
  return /^[a-p]{32}$/.test(id.trim());
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  input.classList.add('error');
}

function clearError() {
  errorMsg.style.display = 'none';
  input.classList.remove('error');
}

// Charge la liste et rafraîchit l'UI
function loadAndRender() {
  chrome.storage.sync.get({ blockedIds: [] }, (data) => {
    const ids = data.blockedIds;
    countEl.textContent = ids.length;

    if (ids.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🔓</div>
          Aucune extension bloquée pour l'instant
        </div>`;
      return;
    }

    // Récupère les infos de toutes les extensions installées
    chrome.management.getAll((allExtensions) => {
      const extMap = {};
      allExtensions.forEach(e => { extMap[e.id] = e; });

      const ul = document.createElement('ul');
      ul.className = 'ext-list';

      ids.forEach((id) => {
        const ext = extMap[id];
        const li = document.createElement('li');

        const dot = document.createElement('div');
        dot.className = 'status-dot ' + (ext ? 'blocked' : 'not-installed');

        const info = document.createElement('div');
        info.className = 'info';

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = ext ? ext.name : 'Extension non installée';

        const extId = document.createElement('div');
        extId.className = 'ext-id';
        extId.textContent = id;

        info.appendChild(name);
        info.appendChild(extId);

        const badge = document.createElement('span');
        badge.className = 'badge ' + (ext ? 'blocked' : 'not-installed');
        badge.textContent = ext ? 'Bloquée' : 'Absente';

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove';
        btnRemove.title = 'Retirer de la liste';
        btnRemove.textContent = '×';
        btnRemove.addEventListener('click', () => removeId(id));

        li.appendChild(dot);
        li.appendChild(info);
        li.appendChild(badge);
        li.appendChild(btnRemove);
        ul.appendChild(li);
      });

      listContainer.innerHTML = '';
      listContainer.appendChild(ul);
    });
  });
}

function addId() {
  const id = input.value.trim().toLowerCase();
  clearError();

  if (!id) {
    showError('Veuillez entrer un ID.');
    return;
  }

  if (!isValidExtensionId(id)) {
    showError('ID invalide — 32 caractères a-p attendus.');
    return;
  }

  chrome.storage.sync.get({ blockedIds: [] }, (data) => {
    const ids = data.blockedIds;

    if (ids.includes(id)) {
      showError('Cet ID est déjà dans la liste.');
      return;
    }

    ids.push(id);
    chrome.storage.sync.set({ blockedIds: ids }, () => {
      input.value = '';
      loadAndRender();
      // Déclenche l'application immédiate
      chrome.runtime.sendMessage({ action: 'enforce' });
    });
  });
}

function removeId(id) {
  chrome.storage.sync.get({ blockedIds: [] }, (data) => {
    const ids = data.blockedIds.filter(i => i !== id);
    chrome.storage.sync.set({ blockedIds: ids }, () => {
      loadAndRender();
    });
  });
}

// Événements
btnAdd.addEventListener('click', addId);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addId();
  clearError();
});

btnEnforce.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'enforce' }, () => {
    btnEnforce.textContent = '✓ Appliqué !';
    setTimeout(() => { btnEnforce.textContent = '⚡ Appliquer maintenant'; }, 1500);
  });
});

// Init
loadAndRender();
