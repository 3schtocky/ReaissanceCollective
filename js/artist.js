// Artist page logic: render beats, audio player, license modal, PayPal

let currentAudio = null;
let currentPlayBtn = null;

// ─── Initialize page ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const artistId = getQueryParam('id');
    if (!artistId) {
        document.getElementById('artist-content').innerHTML =
            '<p class="error-message">No artist specified. <a href="index.html">Return home</a></p>';
        return;
    }

    try {
        const catalog = await loadCatalog();
        const artist = getArtistById(catalog, artistId);

        if (!artist) {
            document.getElementById('artist-content').innerHTML =
                '<p class="error-message">Artist not found. <a href="index.html">Return home</a></p>';
            return;
        }

        renderArtistHeader(artist);
        renderBeatsGrid(artist);
    } catch (err) {
        document.getElementById('artist-content').innerHTML =
            '<p class="error-message">Failed to load artist data. <a href="index.html">Return home</a></p>';
    }
});

// ─── Render artist header ───────────────────────────────────────
function renderArtistHeader(artist) {
    const header = document.getElementById('artist-header');
    const socialLinks = Object.entries(artist.socials || {})
        .map(([platform, url]) =>
            `<a href="${url}" target="_blank" rel="noopener" class="social-link">${platform}</a>`
        ).join('');

    header.innerHTML = `
        <div class="artist-hero">
            <h1>${artist.name}</h1>
            <div class="artist-discipline">${artist.discipline}</div>
            <p class="artist-bio">${artist.bio}</p>
            ${socialLinks ? `<div class="artist-socials">${socialLinks}</div>` : ''}
        </div>
    `;
}

// ─── Render beats grid ──────────────────────────────────────────
function renderBeatsGrid(artist) {
    const grid = document.getElementById('beats-grid');

    if (!artist.beats || artist.beats.length === 0) {
        grid.innerHTML = '<p class="no-beats">No beats available yet. Check back soon.</p>';
        return;
    }

    grid.innerHTML = artist.beats.map(beat => `
        <div class="beat-card" data-beat-id="${beat.id}">
            <div class="beat-card-top">
                <div class="beat-cover">
                    <div class="beat-cover-placeholder">${beat.title.charAt(0)}</div>
                    <button class="play-btn" data-preview="${beat.previewUrl}" data-title="${beat.title}" aria-label="Play preview">
                        <span class="play-icon">&#9654;</span>
                    </button>
                </div>
                <div class="beat-info">
                    <h3 class="beat-title">${beat.title}</h3>
                    <div class="beat-meta">
                        <span class="beat-genre">${beat.genre}</span>
                        <span class="beat-bpm">${beat.bpm} BPM</span>
                        <span class="beat-key">${beat.key}</span>
                    </div>
                    <p class="beat-description">${beat.description}</p>
                    <div class="beat-tags">
                        ${beat.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="beat-licenses">
                <div class="license-header">License Options</div>
                ${beat.licenses.map((lic, i) => `
                    <div class="license-row">
                        <div class="license-info">
                            <div class="license-name">${lic.name}</div>
                            <div class="license-details">${lic.details}</div>
                        </div>
                        <div class="license-price">${formatPrice(lic.price)}</div>
                        <button class="buy-btn" data-beat-id="${beat.id}" data-license-index="${i}"
                                data-price="${lic.price}" data-name="${beat.title} — ${lic.name}"
                                data-download="${lic.downloadUrl}">
                            Buy
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Attach event listeners
    grid.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', handlePlayClick);
    });

    grid.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', handleBuyClick);
    });
}

// ─── Audio player ───────────────────────────────────────────────
function handlePlayClick(e) {
    const btn = e.currentTarget;
    const previewUrl = btn.dataset.preview;
    const title = btn.dataset.title;

    // If clicking the same button that's playing, pause it
    if (currentPlayBtn === btn && currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        btn.querySelector('.play-icon').innerHTML = '&#9654;';
        updatePlayerBar(title, false);
        return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        if (currentPlayBtn) {
            currentPlayBtn.querySelector('.play-icon').innerHTML = '&#9654;';
        }
    }

    // Create new audio or reuse
    currentAudio = new Audio(previewUrl);
    currentPlayBtn = btn;

    currentAudio.play().then(() => {
        btn.querySelector('.play-icon').innerHTML = '&#9646;&#9646;';
        updatePlayerBar(title, true);
    }).catch(() => {
        updatePlayerBar(title + ' (preview unavailable)', false);
    });

    currentAudio.addEventListener('ended', () => {
        btn.querySelector('.play-icon').innerHTML = '&#9654;';
        updatePlayerBar(title, false);
    });

    currentAudio.addEventListener('timeupdate', () => {
        updateProgressBar();
    });
}

function updatePlayerBar(title, isPlaying) {
    const bar = document.getElementById('player-bar');
    const trackName = document.getElementById('player-track-name');
    const playerPlayBtn = document.getElementById('player-play-btn');

    bar.classList.toggle('active', true);
    trackName.textContent = title;
    playerPlayBtn.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
}

function updateProgressBar() {
    if (!currentAudio) return;
    const progress = document.getElementById('player-progress');
    const currentTime = document.getElementById('player-current-time');
    const duration = document.getElementById('player-duration');

    const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
    progress.style.width = pct + '%';
    currentTime.textContent = formatTime(currentAudio.currentTime);
    duration.textContent = formatTime(currentAudio.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function togglePlayerPlayPause() {
    if (!currentAudio) return;
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById('player-play-btn').innerHTML = '&#9646;&#9646;';
        if (currentPlayBtn) currentPlayBtn.querySelector('.play-icon').innerHTML = '&#9646;&#9646;';
    } else {
        currentAudio.pause();
        document.getElementById('player-play-btn').innerHTML = '&#9654;';
        if (currentPlayBtn) currentPlayBtn.querySelector('.play-icon').innerHTML = '&#9654;';
    }
}

function seekPlayer(e) {
    if (!currentAudio) return;
    const bar = document.getElementById('player-progress-bar');
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    currentAudio.currentTime = pct * currentAudio.duration;
}

// ─── PayPal / Buy flow ──────────────────────────────────────────
function handleBuyClick(e) {
    const btn = e.currentTarget;
    const beatName = btn.dataset.name;
    const price = btn.dataset.price;
    const downloadUrl = btn.dataset.download;

    openPurchaseModal(beatName, price, downloadUrl);
}

function openPurchaseModal(beatName, price, downloadUrl) {
    const modal = document.getElementById('purchase-modal');
    const modalTitle = document.getElementById('modal-beat-name');
    const modalPrice = document.getElementById('modal-price');
    const paypalContainer = document.getElementById('paypal-button-container');
    const downloadSection = document.getElementById('download-section');

    modalTitle.textContent = beatName;
    modalPrice.textContent = formatPrice(parseFloat(price));
    downloadSection.style.display = 'none';
    paypalContainer.innerHTML = '';

    modal.classList.add('active');

    // Render PayPal button
    if (typeof paypal !== 'undefined') {
        paypal.Buttons({
            style: {
                color: 'black',
                shape: 'rect',
                label: 'pay',
                height: 40
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        description: beatName,
                        amount: {
                            value: price
                        }
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    // Payment successful — show download
                    paypalContainer.innerHTML =
                        '<div class="payment-success">Payment successful! Thank you.</div>';
                    const downloadLink = document.getElementById('download-link');
                    downloadLink.href = downloadUrl;
                    downloadLink.textContent = 'Download ' + beatName;
                    downloadSection.style.display = 'block';
                });
            },
            onError: function(err) {
                paypalContainer.innerHTML =
                    '<div class="payment-error">Payment failed. Please try again.</div>';
            }
        }).render('#paypal-button-container');
    } else {
        paypalContainer.innerHTML =
            '<div class="paypal-placeholder">PayPal is not configured yet. Set your Client ID to enable purchases.</div>';
    }
}

function closePurchaseModal() {
    document.getElementById('purchase-modal').classList.remove('active');
}
