// Core Elements
const mainAudio = document.getElementById('main-audio');
const mainVideo = document.getElementById('main-video');
const playlistEl = document.getElementById('playlist');
const mediaViewAudio = document.getElementById('audio-view');
const mediaViewVideo = document.getElementById('video-view');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const discIcon = document.getElementById('disc-icon');

// Control Elements
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const loopBtn = document.getElementById('loop-btn');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');

// Action Elements
const mediaUpload = document.getElementById('media-upload');
const subInput = document.getElementById('sub-input');
const subTrack = document.getElementById('sub-track');
const fsToggle = document.getElementById('fs-toggle');
const dropZone = document.getElementById('drop-zone');
const dropIndicator = document.getElementById('drop-indicator');
const playerContainer = document.querySelector('.main-container');
const sidebar = document.querySelector('.sidebar');
const mediaWrapper = document.getElementById('media-wrapper');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeModal = document.querySelector('.close-modal');

// New UI Elements
const contextMenu = document.getElementById('context-menu');
const volumeIndicator = document.getElementById('volume-indicator');
const volumePercentText = document.getElementById('volume-percent');
const subFontSizeInput = document.getElementById('sub-font-size-ctx');
const subColorInput = document.getElementById('sub-color-ctx');

// Modals
const eqModal = document.getElementById('eq-modal');
const subSearchModal = document.getElementById('sub-search-modal');
const closeEq = document.getElementById('close-eq');
const closeSubSearch = document.getElementById('close-sub-search');

// New App State
let playlists = JSON.parse(localStorage.getItem('vsp_playlists') || '[]');
let eqFilters = [];
const folderUpload = document.getElementById('folder-upload');
const eqContainer = document.getElementById('equalizer-controls');
const playlistTabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const createPlaylistBtn = document.querySelector('.create-playlist-btn');
const userPlaylistsEl = document.getElementById('user-playlists');
const subSearchGo = document.getElementById('sub-search-go');
const subSearchQuery = document.getElementById('sub-search-query');
const subSearchResults = document.getElementById('sub-search-results');

const brightnessIndicator = document.getElementById('brightness-indicator');
const brightnessPercentText = document.getElementById('brightness-percent');
const seekIndicator = document.getElementById('seek-indicator');
const seekText = document.getElementById('seek-text');

// Fullscreen Idle Timer
let idleTimer;
const hideDelay = 3000; // 3 seconds

// Application State
let library = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isLoop = false;
let activePlayer = mainAudio;

// Advanced Features State
let abRange = { a: -1, b: -1 };
let zoomLevel = 1;
let isMirror = false;
let isFlip = false;
let subFont = "'Outfit', sans-serif";
let subBold = false;
let subItalic = false;
let subPos = 90;
let playbackSpeed = 1.0;
let subDelay = 0;

// Web Audio API (Visualizer)
let audioCtx, analyser, audioSource, videoSource;
const bufferLength = 128;
const dataArray = new Uint8Array(bufferLength);
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

/* --- 1. MEDIA HANDLING --- */

function handleMediaSelection(files) {
    const fileArray = Array.from(files);
    let firstNewIndex = library.length;

    fileArray.forEach(file => {
        const type = file.type.startsWith('video') ? 'video' : 'audio';

        // Handle subtitle files separately if dropped alone
        if (file.name.endsWith('.vtt') || file.name.endsWith('.srt')) {
            applySubtitles(file);
            return;
        }

        library.push({
            name: file.name.split('.').slice(0, -1).join('.'),
            artist: type === 'video' ? 'Video File' : 'Audio File',
            url: URL.createObjectURL(file),
            type: type,
            file: file
        });
    });

    renderPlaylist();
    // Auto-play the first track of the new batch if nothing was playing
    if (library.length > 0 && (currentIndex === -1 || fileArray.length > 0)) {
        loadTrack(firstNewIndex < library.length ? firstNewIndex : 0);
        playTrack();
    }
}

function renderPlaylist() {
    if (library.length === 0) return;

    playlistEl.innerHTML = '';
    library.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
        div.innerHTML = `
            <div class="item-art"><i class="fas ${item.type === 'video' ? 'fa-video' : 'fa-music'}"></i></div>
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>${item.artist}</p>
            </div>
        `;
        div.onclick = () => {
            loadTrack(index);
        };
        div.ondblclick = () => {
            playTrack();
        };
        playlistEl.appendChild(div);
    });
}

function loadTrack(index) {
    if (index < 0 || index >= library.length) return;

    // Reset current active player
    activePlayer.pause();
    activePlayer.currentTime = 0;

    currentIndex = index;
    const track = library[index];

    // Toggle View Modes
    if (track.type === 'video') {
        activePlayer = mainVideo;
        mediaViewAudio.className = 'inactive-view';
        mediaViewVideo.className = 'active-view';
    } else {
        activePlayer = mainAudio;
        mediaViewAudio.className = 'active-view';
        mediaViewVideo.className = 'inactive-view';
    }

    // Set Source & Meta
    activePlayer.src = track.url;
    activePlayer.load(); // Ensure the source is loaded
    trackTitle.innerText = track.name;
    trackArtist.innerText = track.artist;

    // Update UI highlights
    renderPlaylist();

    // Reset Progress
    progressBar.style.width = '0%';

    // Restore Playback Position
    const savedPos = localStorage.getItem(`vsp_pos_${track.name}_${track.file ? track.file.size : ''}`);
    if (savedPos) {
        activePlayer.currentTime = parseFloat(savedPos);
    }

    // Wire up events for the NEW active player
    attachPlayerEvents();
}

function attachPlayerEvents() {
    activePlayer.ontimeupdate = updateProgressUI;
    activePlayer.onloadedmetadata = () => {
        timeTotal.innerText = formatTime(activePlayer.duration);
    };
    activePlayer.onended = () => {
        if (isLoop) {
            playTrack();
        } else {
            nextTrack();
        }
    };
}

/* --- 2. PLAYBACK CONTROLS --- */

function playTrack() {
    if (currentIndex === -1) return;

    isPlaying = true;
    activePlayer.play().catch(e => console.error("Playback error", e));
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    discIcon.style.animation = 'spin 8s linear infinite';

    // Initialize Visualizer on first real play
    setupVisualizer();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function pauseTrack() {
    isPlaying = false;
    activePlayer.pause();
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    discIcon.style.animation = 'none';
}

function nextTrack() {
    if (library.length === 0) return;
    let nextIndex = isShuffle ? Math.floor(Math.random() * library.length) : (currentIndex + 1) % library.length;
    loadTrack(nextIndex);
    playTrack();
}

function prevTrack() {
    if (library.length === 0) return;
    let prevIndex = (currentIndex - 1 + library.length) % library.length;
    loadTrack(prevIndex);
    playTrack();
}

/* --- 3. UI SYNC & HELPERS --- */

function updateProgressUI() {
    const { currentTime, duration } = activePlayer;
    if (isNaN(duration)) return;

    // A-B Repeat Check
    if (abRange.a !== -1 && abRange.b !== -1) {
        if (currentTime >= abRange.b) {
            activePlayer.currentTime = abRange.a;
            return;
        }
    }

    const percent = (currentTime / duration) * 100;
    progressBar.style.width = `${percent}%`;
    timeCurrent.innerText = formatTime(currentTime);

    // Save playback position
    if (currentIndex !== -1) {
        const track = library[currentIndex];
        localStorage.setItem(`vsp_pos_${track.name}_${track.file ? track.file.size : ''}`, currentTime);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function applySubtitles(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        let content = e.target.result;
        // Basic SRT to VTT conversion
        if (file.name.endsWith('.srt')) {
            content = "WEBVTT\n\n" + content.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
        }
        const blob = new Blob([content], { type: 'text/vtt' });
        subTrack.src = URL.createObjectURL(blob);
        trackArtist.innerText += " (CC Loaded)";
    };
    reader.readAsText(file);
}

/* --- 4. EVENT LISTENERS --- */

// Buttons
playPauseBtn.onclick = () => isPlaying ? pauseTrack() : playTrack();
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

shuffleBtn.onclick = () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle ? 'var(--primary)' : 'var(--text-dim)';
};

loopBtn.onclick = () => {
    isLoop = !isLoop;
    loopBtn.style.color = isLoop ? 'var(--primary)' : 'var(--text-dim)';
};

// Volume
volumeSlider.oninput = (e) => {
    const val = e.target.value;
    activePlayer.volume = val;
    mainAudio.volume = val;
    mainVideo.volume = val;
    muteBtn.className = val == 0 ? 'fas fa-volume-mute' : 'fas fa-volume-up';

    // Show Volume UI Indicator
    showVolumeIndicator(Math.round(val * 100));
};

function showVolumeIndicator(percent) {
    volumePercentText.innerText = `${percent}%`;
    volumeIndicator.classList.add('active');
    clearTimeout(window.volumeTimer);
    window.volumeTimer = setTimeout(() => volumeIndicator.classList.remove('active'), 1500);
}

function showBrightnessIndicator(val) {
    brightnessPercentText.innerText = `${val}%`;
    brightnessIndicator.classList.add('active');
    mainVideo.style.filter = `brightness(${val}%)`;
    if (brightSliderCtx) brightSliderCtx.value = val;
    clearTimeout(window.brightTimer);
    window.brightTimer = setTimeout(() => brightnessIndicator.classList.remove('active'), 1500);
}

function showSeekIndicator(text) {
    seekText.innerText = text;
    seekIndicator.classList.add('active');
    clearTimeout(window.seekTimer);
    window.seekTimer = setTimeout(() => seekIndicator.classList.remove('active'), 800);
}

// Seek
progressContainer.onclick = (e) => {
    if (currentIndex === -1) return;
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    activePlayer.currentTime = pos * activePlayer.duration;
};

// Fullscreen Logic
fsToggle.onclick = () => {
    if (!document.fullscreenElement) {
        if (playerContainer.requestFullscreen) {
            playerContainer.requestFullscreen();
        } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
};

// Handle Mouse movement for hiding controls and pointer
function showPlayerControls() {
    // Always show in normal mode
    playerContainer.classList.remove('hide-controls');
    playerContainer.classList.add('show-controls');
    dropZone.classList.remove('hide-cursor');

    // Reset global cursor styles
    document.body.classList.remove('hide-cursor-global');
    document.documentElement.classList.remove('hide-cursor-global');
    document.body.style.removeProperty('cursor');

    clearTimeout(idleTimer);

    // ONLY auto-hide if in Fullscreen AND playing
    if (document.fullscreenElement && isPlaying) {
        idleTimer = setTimeout(() => {
            playerContainer.classList.add('hide-controls');
            playerContainer.classList.remove('show-controls');
            dropZone.classList.add('hide-cursor');

            // Hard hide global cursor
            document.body.classList.add('hide-cursor-global');
            document.documentElement.classList.add('hide-cursor-global');
            document.body.style.setProperty('cursor', 'none', 'important');
        }, hideDelay);
    }
}

dropZone.addEventListener('mousemove', showPlayerControls);
dropZone.addEventListener('click', showPlayerControls);

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        playerContainer.classList.remove('hide-controls');
        playerContainer.classList.add('show-controls');
        dropZone.classList.remove('hide-cursor');
        document.body.style.cursor = 'default';
        clearTimeout(idleTimer);
    } else {
        showPlayerControls();
    }
});

// Tab Switching
playlistTabs.forEach(tab => {
    tab.onclick = () => {
        playlistTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab === 'library' ? 'playlist' : 'playlists-list').style.display = 'block';
    };
});

// Playlist Management
createPlaylistBtn.onclick = () => {
    const name = prompt("Enter Playlist Name:");
    if (name) {
        playlists.push({ name, tracks: [] });
        savePlaylists();
        renderPlaylistsUI();
    }
};

function savePlaylists() {
    localStorage.setItem('vsp_playlists', JSON.stringify(playlists));
}

function renderPlaylistsUI() {
    userPlaylistsEl.innerHTML = '';
    playlists.forEach((pl, idx) => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <div class="item-art"><i class="fas fa-list"></i></div>
            <div class="item-info">
                <h4>${pl.name}</h4>
                <p>${pl.tracks.length} Tracks</p>
            </div>
            <button class="delete-pl" data-idx="${idx}">&times;</button>
        `;
        div.onclick = (e) => {
            if (e.target.classList.contains('delete-pl')) {
                playlists.splice(idx, 1);
                savePlaylists();
                renderPlaylistsUI();
                return;
            }
            alert(`Opening playlist: ${pl.name} (Track viewing coming soon)`);
        };
        userPlaylistsEl.appendChild(div);
    });
}
renderPlaylistsUI();

// Equalizer Logic
const freqBands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

function createEQSliders() {
    eqContainer.innerHTML = '';
    freqBands.forEach((freq, i) => {
        const container = document.createElement('div');
        container.className = 'eq-slider-container';
        container.innerHTML = `
            <input type="range" class="eq-slider" data-index="${i}" min="-12" max="12" step="0.1" value="0">
            <span class="eq-freq">${freq >= 1000 ? (freq / 1000) + 'k' : freq}</span>
        `;
        eqContainer.appendChild(container);
    });

    document.querySelectorAll('.eq-slider').forEach(slider => {
        slider.oninput = (e) => {
            const index = e.target.dataset.index;
            const value = e.target.value;
            if (eqFilters[index]) eqFilters[index].gain.value = value;
        };
    });
}

function applyEQPreset(preset) {
    const values = {
        reset: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [6, 5, 4, 3, 2, 0, 0, 0, 0, 0],
        pop: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
        rock: [4, 3, 2, -1, -2, -1, 2, 3, 4, 4]
    };
    const presetValues = values[preset] || values.reset;
    document.querySelectorAll('.eq-slider').forEach((slider, i) => {
        slider.value = presetValues[i];
        if (eqFilters[i]) eqFilters[i].gain.value = presetValues[i];
    });
}

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => applyEQPreset(btn.dataset.preset);
});

// Subtitle Search Logic
subSearchGo.onclick = () => {
    const query = subSearchQuery.value;
    if (!query) return;

    subSearchResults.innerHTML = '<p class="hint">Searching external database...</p>';

    // Simulate search find
    setTimeout(() => {
        subSearchResults.innerHTML = `
            <div class="sub-result-item">
                <span>${query}.en.srt (Auto-Generated)</span>
                <button class="main-btn btn-sm" onclick="window.open('https://www.opensubtitles.org/en/search2/sublanguageid-all/moviename-${encodeURIComponent(query)}', '_blank')">Find on OpenSubs</button>
            </div>
            <p class="hint">Direct API integration requires VS Cloud License. Opening search results in new tab.</p>
        `;
    }, 1000);
};

// Modals Open/Close
// Redundant listeners removed (moved to end of script)

closeEq.onclick = () => eqModal.classList.remove('active');
closeSubSearch.onclick = () => subSearchModal.classList.remove('active');

// Sync Branding
document.querySelectorAll('footer p, .sidebar-footer p').forEach(p => {
    if (p.innerText.includes('VS Entertainment')) p.innerText = '© VS Entertainment';
});

document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== mobileMenuToggle) {
        sidebar.classList.remove('active');
    }
});

// Mouse Wheel Volume (Safe Version)
dropZone.addEventListener('wheel', (e) => {
    e.preventDefault();
    let change = e.deltaY < 0 ? 0.05 : -0.05;
    let newVal = Math.max(0, Math.min(1, parseFloat(volumeSlider.value) + change));
    volumeSlider.value = newVal;
    volumeSlider.dispatchEvent(new Event('input'));
}, { passive: false });

// Keyboard Hotkeys
document.addEventListener('keydown', (e) => {
    // Prevent default for handled keys
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case ' ':
            isPlaying ? pauseTrack() : playTrack();
            break;
        case 's':
        case 'S':
            pauseTrack();
            activePlayer.currentTime = 0;
            break;
        case 'ArrowUp':
            volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
            volumeSlider.dispatchEvent(new Event('input'));
            break;
        case 'ArrowDown':
            volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
            volumeSlider.dispatchEvent(new Event('input'));
            break;
        case 'ArrowRight':
            activePlayer.currentTime = Math.min(activePlayer.duration, activePlayer.currentTime + 10);
            showSeekIndicator('+10s');
            break;
        case 'ArrowLeft':
            activePlayer.currentTime = Math.max(0, activePlayer.currentTime - 10);
            showSeekIndicator('-10s');
            break;
        case 'b':
        case 'B':
            brightness = Math.min(200, brightness + 10);
            showBrightnessIndicator(brightness);
            break;
        case 'v':
        case 'V':
            brightness = Math.max(10, brightness - 10);
            showBrightnessIndicator(brightness);
            break;
        case 'Enter':
            fsToggle.click();
            break;
        case 'r':
        case 'R':
            handleABRepeat();
            break;
    }
});

mediaWrapper.addEventListener('dblclick', (e) => {
    if (e.target.closest('button') || e.target.closest('.video-ui-indicator')) return;
    if (currentIndex !== -1) {
        isPlaying ? pauseTrack() : playTrack();
    }
});

// Context Menu Logic - Target only the screen (player area)
dropZone.addEventListener('contextmenu', (e) => {
    // If clicking on some input elements inside the menu, allow default
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    e.preventDefault();
    contextMenu.style.display = 'block';

    const rect = playerContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Boundary check for main menu
    const menuWidth = 280; // from CSS
    if (x + menuWidth > rect.width) x -= menuWidth;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // Wait for DOM update to get accurate heights
    requestAnimationFrame(() => {
        const menuHeight = contextMenu.offsetHeight;
        if (y + menuHeight > rect.height) {
            y = rect.height - menuHeight - 10;
            contextMenu.style.top = `${Math.max(10, y)}px`;
            contextMenu.classList.add('up-submenus');
        } else {
            contextMenu.classList.remove('up-submenus');
        }

        // Submenu direction check
        const submenuWidth = 200;
        if (x + menuWidth + submenuWidth > rect.width) {
            contextMenu.classList.add('reverse-submenus');
        } else {
            contextMenu.classList.remove('reverse-submenus');
        }
    });
});

// Handle menu closing: Hide on outside click OR when selecting a non-interactive command
window.addEventListener('click', (e) => {
    const isInsideMenu = contextMenu.contains(e.target);
    const isInteractive = e.target.closest('input, select, range');

    if (!isInsideMenu || !isInteractive) {
        contextMenu.style.display = 'none';
        contextMenu.classList.remove('up-submenus', 'reverse-submenus');
    }
}, true); // Use capture to ensure it handles clicks before other listeners if needed

// Prevent menu close when clicking specific interactive parts
contextMenu.addEventListener('click', (e) => {
    if (e.target.closest('input, select')) {
        e.stopPropagation();
    }
});

// Also hide on right click elsewhere if needed, or esc key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') contextMenu.style.display = 'none';
});

// Context Menu Actions
document.getElementById('ctx-open').onclick = () => mediaUpload.click();
document.getElementById('ctx-play-pause').onclick = () => isPlaying ? pauseTrack() : playTrack();
document.getElementById('ctx-stop').onclick = () => {
    pauseTrack();
    activePlayer.currentTime = 0;
};
document.getElementById('ctx-prev').onclick = prevTrack;
document.getElementById('ctx-next').onclick = nextTrack;

document.getElementById('ctx-fullscreen').onclick = () => fsToggle.click();

document.getElementById('ctx-bright-up').onclick = () => {
    brightness = Math.min(200, brightness + 10);
    showBrightnessIndicator(brightness);
};
document.getElementById('ctx-bright-down').onclick = () => {
    brightness = Math.max(10, brightness - 10);
    showBrightnessIndicator(brightness);
};

document.getElementById('ctx-vol-up').onclick = () => {
    volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.1);
    volumeSlider.dispatchEvent(new Event('input'));
};
document.getElementById('ctx-vol-down').onclick = () => {
    volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.1);
    volumeSlider.dispatchEvent(new Event('input'));
};
document.getElementById('ctx-mute').onclick = () => {
    const isMuted = activePlayer.volume === 0;
    volumeSlider.value = isMuted ? 0.8 : 0;
    volumeSlider.dispatchEvent(new Event('input'));
};

document.getElementById('ctx-equalizer-menu').onclick = () => {
    eqModal.classList.add('active');
    createEQSliders();
};
document.getElementById('ctx-sub-load').onclick = () => subInput.click();
document.getElementById('ctx-sub-search-menu').onclick = () => subSearchModal.classList.add('active');

document.getElementById('ctx-playlists').onclick = () => {
    playlistTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.style.display = 'none');
    const plTab = Array.from(playlistTabs).find(t => t.dataset.tab === 'playlists');
    if (plTab) plTab.classList.add('active');
    document.getElementById('playlists-list').style.display = 'block';
    if (!sidebar.classList.contains('active') && window.innerWidth <= 900) {
        sidebar.classList.add('active');
    }
};

document.getElementById('ctx-settings').onclick = () => alert('VS Ultimate Settings panel is coming soon!');
document.getElementById('ctx-about').onclick = () => aboutModal.classList.add('active');
document.getElementById('ctx-exit').onclick = () => {
    if (confirm("Are you sure you want to exit VS Player?")) {
        window.close();
        // Fallback for browsers that don't allow window.close()
        alert("To exit, please close the tab or browser window.");
    }
};

// Dedicated Add Subtitle Button & Context Listeners
const subFontSizeCtx = document.getElementById('sub-font-size-ctx');
const brightSliderCtx = document.getElementById('ctx-bright-slider');
const addSubBtnDedicated = document.getElementById('add-sub-btn-dedicated');

if (subFontSizeCtx) {
    subFontSizeCtx.oninput = (e) => {
        if (subFontSizeInput) {
            subFontSizeInput.value = e.target.value;
            subFontSizeInput.dispatchEvent(new Event('input'));
        }
    };
}

if (brightSliderCtx) {
    brightSliderCtx.oninput = (e) => {
        brightness = parseInt(e.target.value);
        showBrightnessIndicator(brightness);
    };
}

if (addSubBtnDedicated) {
    addSubBtnDedicated.onclick = () => subInput.click();
}

// Subtitle Style Application
function updateSubStyle() {
    const size = subFontSizeInput ? subFontSizeInput.value : 24;
    const color = subColorInput ? subColorInput.value : '#ffffff';

    const style = document.createElement('style');
    style.id = 'dynamic-sub-style';
    const existing = document.getElementById('dynamic-sub-style');
    if (existing) existing.remove();

    style.innerHTML = `
        ::cue { 
            font-size: ${size}px !important; 
            color: ${color} !important; 
            font-family: ${subFont} !important;
            font-weight: ${subBold ? 'bold' : 'normal'} !important;
            font-style: ${subItalic ? 'italic' : 'normal'} !important;
        }
        .custom-subtitle-overlay { bottom: ${100 - subPos}% !important; }
    `;
    document.head.appendChild(style);
}

if (subFontSizeInput) subFontSizeInput.oninput = updateSubStyle;
if (subColorInput) subColorInput.oninput = updateSubStyle;

// Advanced Subtitle Control Listeners
const subFontCtx = document.getElementById('sub-font-ctx');
const subPosCtx = document.getElementById('sub-pos-ctx');
const subBoldBtn = document.getElementById('ctx-sub-bold');
const subItalicBtn = document.getElementById('ctx-sub-italic');

if (subFontCtx) subFontCtx.onchange = (e) => { subFont = e.target.value; updateSubStyle(); };
if (subPosCtx) subPosCtx.oninput = (e) => { subPos = e.target.value; updateSubStyle(); };
if (subBoldBtn) subBoldBtn.onclick = () => {
    subBold = !subBold;
    subBoldBtn.querySelector('i').style.display = subBold ? 'inline' : 'none';
    updateSubStyle();
};
if (subItalicBtn) subItalicBtn.onclick = () => {
    subItalic = !subItalic;
    subItalicBtn.querySelector('i').style.display = subItalic ? 'inline' : 'none';
    updateSubStyle();
};

// Screen Settings Actions
document.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.onclick = () => {
        zoomLevel = parseFloat(btn.dataset.zoom);
        updateVisualSettings();
    };
});

document.getElementById('ctx-mirror').onclick = () => {
    isMirror = !isMirror;
    document.getElementById('ctx-mirror').querySelector('i').style.display = isMirror ? 'inline' : 'none';
    updateVisualSettings();
};

document.getElementById('ctx-flip').onclick = () => {
    isFlip = !isFlip;
    document.getElementById('ctx-flip').querySelector('i').style.display = isFlip ? 'inline' : 'none';
    updateVisualSettings();
};

document.getElementById('ctx-reset-transform').onclick = () => {
    isMirror = false;
    isFlip = false;
    zoomLevel = 1;
    document.getElementById('ctx-mirror').querySelector('i').style.display = 'none';
    document.getElementById('ctx-flip').querySelector('i').style.display = 'none';
    updateVisualSettings();
};

function updateVisualSettings() {
    let transform = `scale(${zoomLevel})`;
    if (isMirror) transform += ` scaleX(-1)`;
    if (isFlip) transform += ` scaleY(-1)`;
    mainVideo.style.transform = transform;
}

// Speed Actions
document.querySelectorAll('[data-speed]').forEach(btn => {
    btn.onclick = () => {
        playbackSpeed = parseFloat(btn.dataset.speed);
        activePlayer.playbackRate = playbackSpeed;
        showSeekIndicator(`Speed: ${playbackSpeed}x`);
    };
});

// A-B Repeat Logic
const abRepeatBtn = document.getElementById('ctx-ab-repeat');
const abIndicator = document.getElementById('ab-indicator');
const abStatus = document.getElementById('ab-status');

abRepeatBtn.onclick = handleABRepeat;

function handleABRepeat() {
    if (abRange.a === -1) {
        abRange.a = activePlayer.currentTime;
        abIndicator.classList.add('active');
        abStatus.innerText = 'A-B: Point A set';
    } else if (abRange.b === -1) {
        if (activePlayer.currentTime <= abRange.a) {
            alert("Point B must be after Point A");
            return;
        }
        abRange.b = activePlayer.currentTime;
        abStatus.innerText = 'A-B: Loop Active';
    } else {
        abRange = { a: -1, b: -1 };
        abIndicator.classList.remove('active');
    }
}

// Subtitle Sync Logic
const subSyncInput = document.getElementById('sub-sync-ctx');
const subSyncVal = document.getElementById('sub-sync-val');

if (subSyncInput) {
    subSyncInput.oninput = (e) => {
        subDelay = parseFloat(e.target.value);
        subSyncVal.innerText = `${subDelay > 0 ? '+' : ''}${subDelay}s`;
        applySubSync();
    };
}

function applySubSync() {
    if (!subTrack.track) return;
    const cues = subTrack.track.cues;
    if (!cues) return;

    // Note: cues are read-only in some browsers, but we can try to adjust them 
    // or use a custom subtitle renderer if needed. 
    // For now, most modern browsers allow setting startTime/endTime if the VTT is local.
    for (let i = 0; i < cues.length; i++) {
        cues[i].startTime = cues[i].originalStartTime + subDelay;
        cues[i].endTime = cues[i].originalEndTime + subDelay;
    }
}

// Right-click dragging for Subtitles
const subOverlay = document.getElementById('custom-subtitles');
let isDraggingSub = false;

subOverlay.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right click
        isDraggingSub = true;
        subOverlay.classList.add('dragging');
        e.preventDefault();
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingSub) {
        const rect = playerContainer.getBoundingClientRect();
        const y = e.clientY - rect.top;
        subPos = 100 - (y / rect.height * 100);
        subPos = Math.max(0, Math.min(100, subPos));
        if (subPosCtx) subPosCtx.value = 100 - subPos;
        updateSubStyle();
    }
});

document.addEventListener('mouseup', () => {
    isDraggingSub = false;
    subOverlay.classList.remove('dragging');
});

// Capture original cues times
subTrack.onloadeddata = () => {
    const cues = subTrack.track.cues;
    for (let i = 0; i < cues.length; i++) {
        cues[i].originalStartTime = cues[i].startTime;
        cues[i].originalEndTime = cues[i].endTime;
    }
}

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropIndicator.style.display = 'flex';
});

dropZone.addEventListener('dragleave', () => {
    dropIndicator.style.display = 'none';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropIndicator.style.display = 'none';
    handleMediaSelection(e.dataTransfer.files);
});

mediaUpload.onchange = (e) => handleMediaSelection(e.target.files);
subInput.onchange = (e) => {
    if (e.target.files.length > 0) applySubtitles(e.target.files[0]);
};

// Video Click Play/Pause
mainVideo.onclick = (e) => {
    e.stopPropagation();
    isPlaying ? pauseTrack() : playTrack();
};

// About Modal
aboutBtn.onclick = () => aboutModal.classList.add('active');
closeModal.onclick = () => aboutModal.classList.remove('active');
window.onclick = (e) => {
    if (e.target === aboutModal) aboutModal.classList.remove('active');
};

/* --- 5. VISUALIZER ENGINE --- */

function setupVisualizer() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();

        // Build EQ Filter Chain
        eqFilters = []; // Reset array
        let lastNode = analyser;
        freqBands.forEach(freq => {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            eqFilters.push(filter);

            lastNode.connect(filter);
            lastNode = filter;
        });

        // The LAST node in the chain connects to speaker
        lastNode.connect(audioCtx.destination);

        // Reusable source connection logic
        audioSource = audioCtx.createMediaElementSource(mainAudio);
        videoSource = audioCtx.createMediaElementSource(mainVideo);

        audioSource.connect(analyser);
        videoSource.connect(analyser);

        analyser.fftSize = 256;
        drawLoop();
    } catch (e) { console.warn("Visualizer failed to start", e); }
}

function drawLoop() {
    requestAnimationFrame(drawLoop);
    if (!isPlaying) return;

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set dynamic canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * 0.6;
        const angle = (i / bufferLength) * Math.PI * 2;

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.strokeStyle = `hsla(${230 + (i * 1.5)}, 100%, 65%, ${dataArray[i] / 255})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}
// --- 5. ELECTRON INTEGRATION ---

if (window.electronAPI) {
    window.electronAPI.onOpenFile((filePath) => {
        handleDirectFileOpen(filePath);
    });
}

function handleDirectFileOpen(filePath) {
    if (!filePath) return;

    // Extract filename
    const fileName = filePath.split(/[\\/]/).pop();
    const ext = fileName.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mkv', 'webm', 'avi', 'mov'].includes(ext);
    const type = isVideo ? 'video' : 'audio';

    // Check if it's a subtitle file
    if (ext === 'vtt' || ext === 'srt') {
        // For subtitles, we might need a way to read them or just pass the vsp-media URL
        // applySubtitles expects a File object. Let's create a proxy or fetch it.
        fetch(`vsp-media://${filePath}`)
            .then(res => res.text())
            .then(content => {
                if (ext === 'srt') {
                    content = "WEBVTT\n\n" + content.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
                }
                const blob = new Blob([content], { type: 'text/vtt' });
                subTrack.src = URL.createObjectURL(blob);
                trackArtist.innerText += " (CC Loaded)";
            });
        return;
    }

    const name = fileName.split('.').slice(0, -1).join('.');
    const url = `vsp-media://${filePath.replace(/\\/g, '/')}`;

    // Check if already in library
    const existingIndex = library.findIndex(item => item.url === url);
    if (existingIndex !== -1) {
        loadTrack(existingIndex);
        playTrack();
        return;
    }

    // Add to library
    const newIndex = library.length;
    library.push({
        name: name,
        artist: type === 'video' ? 'Local Video' : 'Local Audio',
        url: url,
        type: type,
        path: filePath // Store path for reference
    });

    renderPlaylist();
    loadTrack(newIndex);
    playTrack();
}
