
const $ = (selector) => document.querySelector(selector);

const audio = $('#audioElement');

let tracks = [];
let currentIndex = -1;
let currentUser = null;

// =====================================================
// 1. OUTILS ET SÉCURITÉ
// =====================================================

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }

  return data;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function resetForm(form) {
  if (form instanceof HTMLFormElement) {
    form.reset();
  }
}

function message(element, text, error = false) {
  if (!element) return;

  element.textContent = text;
  element.style.color = error ? '#a13d31' : '#637b54';
}

function time(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';

  return `${Math.floor(seconds / 60)}:${String(
    Math.floor(seconds % 60)
  ).padStart(2, '0')}`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

// Ajoute un événement uniquement si l'élément existe.
function on(selector, event, callback) {
  const element = $(selector);

  if (!element) {
    console.warn(`Élément HTML introuvable : ${selector}`);
    return;
  }

  element.addEventListener(event, callback);
}

// =====================================================
// 2. GESTION DES POCHETTES
// =====================================================

function getCoverUrl(track) {
  // URL fournie directement par le backend
  if (track.cover_url) {
    return track.cover_url;
  }

  // Route de récupération de la pochette
  if (track.cover_name) {
    return `/api/tracks/${encodeURIComponent(track.id)}/cover`;
  }

  return null;
}

function renderCover(track, className = 'track-cover') {
  const cover = getCoverUrl(track);

  if (!cover) {
    return `<div class="${className} cover-placeholder">M.</div>`;
  }

  return `
    <div class="${className} cover-wrapper">
      <img
        src="${escapeHTML(cover)}"
        alt="Pochette de ${escapeHTML(track.title)}"
        loading="lazy"
        onerror="this.hidden=true"
      >
      <span class="cover-fallback">M.</span>
    </div>
  `;
}

// =====================================================
// 3. CHARGEMENT DU CATALOGUE
// =====================================================

async function loadTracks() {
  const data = await api('/api/tracks');

  tracks = Array.isArray(data.tracks) ? data.tracks : [];

  const count = $('#trackCount');
  const grid = $('#trackGrid');

  if (count) {
    count.textContent =
      `CATALOGUE — ${String(tracks.length).padStart(2, '0')} TITRE${tracks.length > 1 ? 'S' : ''}`;
  }

  if (!grid) return;

  if (!tracks.length) {
    grid.innerHTML = `
      <article class="empty-state">
        <span class="empty-symbol">M.</span>
        <h3>Le catalogue prend vie.</h3>
        <p>
          Les premiers morceaux apparaîtront ici
          après validation par l’équipe MELÓMANE.
        </p>
      </article>
    `;

    return;
  }

  grid.innerHTML = tracks.map((track, index) => `
    <article class="track-card">

      ${renderCover(track, 'track-art')}

      <h3>${escapeHTML(track.title)}</h3>

      <p>${escapeHTML(track.artist_name)}</p>

      <button type="button" data-play="${index}">
        Écouter ↗
      </button>

    </article>
  `).join('');

  grid.querySelectorAll('[data-play]').forEach(button => {
    button.addEventListener('click', () => {
      playTrack(Number(button.dataset.play));
    });
  });
}

// =====================================================
// 4. LECTEUR MUSICAL
// =====================================================

async function playTrack(index) {
  if (!currentUser) {
    alert('Connectez-vous pour écouter les morceaux.');
    return;
  }

  if (!audio) {
    console.error('Élément audioElement introuvable.');
    return;
  }

  const track = tracks[index];

  if (!track) return;

  currentIndex = index;

  audio.src = `/api/tracks/${encodeURIComponent(track.id)}/audio`;

  

  const title = $('#nowTitle');
  const artist = $('#nowArtist');
  const cover = $('#nowCover');

  if (title) title.textContent = track.title;
  if (artist) artist.textContent = track.artist_name;

  // Pochette du lecteur
  if (cover) {
    const coverUrl = getCoverUrl(track);

    if (coverUrl) {
      cover.src = coverUrl;
      cover.hidden = false;
    } else {
      cover.removeAttribute('src');
      cover.hidden = true;
    }
  }

audio.onerror = () => {
  console.error('Erreur audio :', audio.error);
  console.error('Code erreur :', audio.error?.code);
  console.error('URL audio :', audio.src);

  alert('Erreur lors du chargement du fichier audio.');
};

try {
  console.log('Chargement du morceau :', audio.src);

  await audio.play();

  const button = $('#playButton');
  if (button) button.textContent = 'Ⅱ';

} catch (error) {
  console.error('Erreur complète du lecteur :', error);
  console.error('État audio :', {
    src: audio.src,
    readyState: audio.readyState,
    networkState: audio.networkState,
    error: audio.error
  });

  alert(`Lecture impossible : ${error.message}`);
}
}

function moveTrack(delta) {
  if (!tracks.length) return;

  let next;

  if (currentIndex === -1) {
    next = 0;
  } else {
    next = (currentIndex + delta + tracks.length) % tracks.length;
  }

  playTrack(next);
}

// =====================================================
// 5. COMMANDES AUDIO
// =====================================================

on('#playButton', 'click', async () => {
  if (!audio || !audio.src) return;

  try {
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  } catch (error) {
    console.error(error);
  }
});

if (audio) {
  audio.addEventListener('play', () => {
    const button = $('#playButton');
    if (button) button.textContent = 'Ⅱ';
  });

  audio.addEventListener('pause', () => {
    const button = $('#playButton');
    if (button) button.textContent = '▶';
  });

  audio.addEventListener('ended', () => {
    moveTrack(1);
  });

  audio.addEventListener('timeupdate', () => {
    const currentTime = $('#currentTime');
    const duration = $('#duration');
    const seekBar = $('#seekBar');

    if (currentTime) {
      currentTime.textContent = time(audio.currentTime);
    }

    if (duration) {
      duration.textContent = time(audio.duration);
    }

    if (seekBar) {
      seekBar.value = audio.duration
        ? (audio.currentTime / audio.duration) * 100
        : 0;
    }
  });
}

on('#prevButton', 'click', () => moveTrack(-1));
on('#nextButton', 'click', () => moveTrack(1));

on('#seekBar', 'input', event => {
  if (audio && audio.duration) {
    audio.currentTime =
      audio.duration * Number(event.target.value) / 100;
  }
});

// =====================================================
// 6. COMPTE UTILISATEUR
// =====================================================

async function refreshAccount() {
  const data = await api('/api/me');

  currentUser = data.user;

  const status = $('#accountStatus');
  const adminPanel = $('#adminPanel');

  if (status) {
    status.textContent = currentUser
      ? `Connecté en tant que ${currentUser.display_name} — rôle : ${
          currentUser.role === 'admin'
            ? 'administrateur'
            : 'utilisateur'
        }.`
      : 'Vous n’êtes pas connecté.';
  }

  if (adminPanel) {
    adminPanel.hidden = currentUser?.role !== 'admin';
  }

  if (currentUser) {
    await loadMySubmissions();
  }

  if (currentUser?.role === 'admin') {
    await loadAdminSubmissions();
  }
}

// =====================================================
// 7. PROPOSITIONS DE MORCEAUX
// =====================================================

async function loadMySubmissions() {
  const data = await api('/api/my-submissions');

  const container = $('#mySubmissions');

  if (!container) return;

  container.innerHTML = `
    <h3>Mes propositions</h3>

    ${
      data.submissions.length
        ? data.submissions.map(submission => `
            <div class="submission-row">
              <span>
                ${escapeHTML(submission.track_title)}
                — ${escapeHTML(submission.artist_name)}
              </span>

              <span class="status">
                ${escapeHTML(submission.status)}
              </span>
            </div>
          `).join('')
        : '<p class="muted">Aucune proposition pour le moment.</p>'
    }
  `;
}

// =====================================================
// 8. FORMULAIRE DE PROPOSITION
// =====================================================

on('#submissionForm', 'submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const output = $('#submissionMessage');

  if (!currentUser) {
    return message(
      output,
      'Connectez-vous avant de proposer un morceau.',
      true
    );
  }

  const fd = new FormData(form);

  const rightsCheckbox = form.elements.namedItem('rightsConfirmed');

  fd.set(
    'rightsConfirmed',
    rightsCheckbox?.checked ? 'true' : 'false'
  );

  try {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    await api('/api/submissions', {
      method: 'POST',
      body: fd
    });

    resetForm(form);

    message(
      output,
      'Votre morceau a été envoyé à l’équipe MELÓMANE.'
    );

    await loadMySubmissions();

  } catch (error) {
    message(output, error.message, true);

  } finally {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = false;
  }
});

// =====================================================
// 9. ADMINISTRATION
// =====================================================

async function loadAdminSubmissions() {
  const data = await api('/api/admin/submissions');

  const container = $('#adminSubmissions');

  if (!container) return;

  container.innerHTML = data.submissions.length
    ? data.submissions.map(submission => `
        <div class="submission-row" style="display:block">

          <strong>
            ${escapeHTML(submission.track_title)}
          </strong>

          — ${escapeHTML(submission.artist_name)}

          <br>

          <span class="muted">
            ${escapeHTML(submission.email)}
            · ${escapeHTML(submission.rights_model)}
            · ${escapeHTML(submission.status)}
          </span>

          ${
            submission.status === 'pending'
              ? `
                <div class="admin-actions">

                  <button
                    type="button"
                    data-review="${escapeHTML(submission.id)}"
                    data-decision="approved">
                    Approuver
                  </button>

                  <button
                    type="button"
                    data-review="${escapeHTML(submission.id)}"
                    data-decision="rejected">
                    Refuser
                  </button>

                </div>
              `
              : ''
          }

        </div>
      `).join('')
    : '<p>Aucune proposition reçue.</p>';

  container.querySelectorAll('[data-review]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.review;
      const decision = button.dataset.decision;

      button.disabled = true;

      try {
        await api(
          `/api/admin/submissions/${encodeURIComponent(id)}/review`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ decision })
          }
        );

        await loadAdminSubmissions();
        await loadTracks();

      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
  });
}

// =====================================================
// 10. INSCRIPTION
// =====================================================

on('#registerForm', 'submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;

  try {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    await api('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData(form))
    });

    resetForm(form);

    await refreshAccount();

  } catch (error) {
    alert(error.message);

  } finally {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = false;
  }
});

// =====================================================
// 11. CONNEXION
// =====================================================

on('#loginForm', 'submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;

  try {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    await api('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData(form))
    });

    resetForm(form);

    await refreshAccount();

  } catch (error) {
    alert(error.message);

  } finally {
    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = false;
  }
});

// =====================================================
// 12. NAVIGATION
// =====================================================

on('#menuButton', 'click', () => {
  const nav = $('nav');

  if (nav) {
    nav.classList.toggle('open');
  }
});

on('#refreshTracks', 'click', () => {
  loadTracks().catch(error => alert(error.message));
});

// =====================================================
// 13. INITIALISATION
// =====================================================

const year = $('#year');

if (year) {
  year.textContent = new Date().getFullYear();
}

async function init() {
  try {
    await Promise.all([
      loadTracks(),
      refreshAccount()
    ]);

    console.log('MELÓMANE initialisé avec succès.');

  } catch (error) {
    console.error('Erreur initialisation MELÓMANE :', error);
  }
}

init();
