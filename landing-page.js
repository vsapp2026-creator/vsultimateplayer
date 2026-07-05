document.addEventListener('DOMContentLoaded', () => {
    // --- 1. MOUSE GLOW FOLLOWER ---
    const glowEl = document.createElement('div');
    glowEl.className = 'cursor-glow';
    document.body.appendChild(glowEl);

    document.addEventListener('mousemove', (e) => {
        glowEl.style.left = `${e.clientX}px`;
        glowEl.style.top = `${e.clientY}px`;
    });

    // --- 2. NAVBAR SCROLL EFFECT ---
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- 3. HERO PLAYER MOCKUP INTERACTIVITY ---
    const playBtn = document.querySelector('.play-btn-pulsing');
    const vinyl = document.getElementById('rotating-vinyl');
    const visualizerBars = document.querySelectorAll('.mockup-visualizer .bar');
    const progressFill = document.querySelector('.mockup-progress-fill');
    const trackTimeCurrent = document.querySelector('.track-time span:first-child');
    const trackNameEl = document.querySelector('.track-name');
    const artistNameEl = document.querySelector('.artist-name');
    const prevBtn = document.querySelector('.mockup-controls button:nth-child(2)');
    const nextBtn = document.querySelector('.mockup-controls button:nth-child(4)');
    
    let isPlaying = true; // Starts playing by default in design
    let animationFrameId = null;
    let trackProgress = 52; // Default starting position in html
    let trackSeconds = 105; // 01:45
    const totalDurationSeconds = 200; // 03:20

    // Demo Tracks List
    const demoTracks = [
        { name: "Cyberpunk Synthwave Presets", artist: "VS Entertainment - Pro Audio Demo" },
        { name: "Neon Horizon (Extended Mix)", artist: "Viraj Sanjeewa - Synthwave" },
        { name: "Ultimate Bass Booster 8D", artist: "VS Audio Labs - Test Track" }
    ];
    let currentTrackIdx = 0;

    function formatTime(secs) {
        const mins = Math.floor(secs / 60);
        const remainingSecs = Math.floor(secs % 60);
        return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }

    function animateVisualizer() {
        if (!isPlaying) {
            visualizerBars.forEach(bar => {
                bar.style.transform = 'scaleY(0.15)';
            });
            return;
        }

        visualizerBars.forEach(bar => {
            // Random scaling between 0.2 and 1.0 for dynamic bar bouncing
            const scale = 0.15 + Math.random() * 0.85;
            bar.style.transform = `scaleY(${scale})`;
        });

        // Slow simulation of track progress
        trackProgress += 0.02;
        if (trackProgress >= 100) {
            trackProgress = 0;
            trackSeconds = 0;
        }
        progressFill.style.width = `${trackProgress}%`;

        trackSeconds += 0.016; // Approx 60fps increments
        trackTimeCurrent.textContent = formatTime(trackSeconds);

        animationFrameId = requestAnimationFrame(animateVisualizer);
    }

    // Toggle Play/Pause
    if (playBtn) {
        // Stop default progress animation from CSS, control via JS
        progressFill.style.animation = 'none';

        playBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            if (isPlaying) {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                vinyl.style.animationPlayState = 'running';
                animateVisualizer();
            } else {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                vinyl.style.animationPlayState = 'paused';
                cancelAnimationFrame(animationFrameId);
                // Flatten visualizer
                visualizerBars.forEach(bar => {
                    bar.style.transition = 'transform 0.3s ease';
                    bar.style.transform = 'scaleY(0.15)';
                });
            }
        });
        
        // Start animation loop
        animateVisualizer();
    }

    // Change track functionality
    function changeTrack(direction) {
        currentTrackIdx = (currentTrackIdx + direction + demoTracks.length) % demoTracks.length;
        const track = demoTracks[currentTrackIdx];
        
        trackNameEl.style.opacity = '0';
        artistNameEl.style.opacity = '0';
        
        setTimeout(() => {
            trackNameEl.textContent = track.name;
            artistNameEl.textContent = track.artist;
            trackNameEl.style.opacity = '1';
            artistNameEl.style.opacity = '1';
        }, 200);

        // Reset progress
        trackProgress = 0;
        trackSeconds = 0;
        progressFill.style.width = '0%';
        trackTimeCurrent.textContent = '00:00';
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => changeTrack(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changeTrack(1));
    }

    // --- 4. EQ SLIDERS & PRESETS INTERACTIVITY ---
    const eqSliders = document.querySelectorAll('.eq-slider-col');
    const eqPresetButtons = document.querySelectorAll('.eq-preset-btn');
    const eqGlowRing = document.querySelector('.disc-glow-ring');

    // Preset configurations (height values out of 100)
    const presets = {
        'bass boost': [85, 80, 70, 55, 40, 30, 25, 25, 25, 25],
        'pop': [45, 55, 65, 75, 60, 50, 60, 65, 55, 45],
        'rock': [75, 70, 55, 40, 45, 55, 65, 75, 80, 85],
        'clear vocals': [20, 25, 30, 40, 60, 78, 85, 80, 70, 55]
    };

    function applyPreset(presetName) {
        const presetValues = presets[presetName.toLowerCase()];
        if (!presetValues) return;

        eqSliders.forEach((col, index) => {
            const handle = col.querySelector('.slider-handle');
            const targetVal = presetValues[index];
            
            // Animate using smooth transition temporary class
            handle.style.transition = 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            handle.style.bottom = `${targetVal}%`;
            
            // Remove transition style afterwards to allow smooth dragging
            setTimeout(() => {
                handle.style.transition = '';
            }, 400);
        });

        // Visual enhancement: change color intensity of vinyl glow ring based on preset
        if (eqGlowRing) {
            if (presetName.toLowerCase() === 'bass boost') {
                eqGlowRing.style.boxShadow = '0 0 35px rgba(255, 60, 120, 0.6)';
                eqGlowRing.style.background = 'radial-gradient(circle, transparent 50%, rgba(255, 60, 120, 0.4) 100%)';
            } else if (presetName.toLowerCase() === 'clear vocals') {
                eqGlowRing.style.boxShadow = '0 0 35px rgba(6, 182, 212, 0.6)';
                eqGlowRing.style.background = 'radial-gradient(circle, transparent 50%, rgba(6, 182, 212, 0.4) 100%)';
            } else {
                eqGlowRing.style.boxShadow = '0 0 20px rgba(255, 60, 120, 0.2)';
                eqGlowRing.style.background = 'radial-gradient(circle, transparent 60%, var(--primary-glow) 100%)';
            }
        }
    }

    // Initialize EQ handle dragging
    eqSliders.forEach((col) => {
        const track = col.querySelector('.slider-track');
        const handle = col.querySelector('.slider-handle');

        function updateSliderPosition(clientY) {
            const rect = track.getBoundingClientRect();
            let percentage = ((rect.bottom - clientY) / rect.height) * 100;
            
            // Boundary constraints
            percentage = Math.max(0, Math.min(100, percentage));
            handle.style.bottom = `${percentage}%`;

            // Deactivate preset active states when user customizes
            eqPresetButtons.forEach(btn => btn.classList.remove('active'));
        }

        // Mouse Events
        track.addEventListener('mousedown', (e) => {
            updateSliderPosition(e.clientY);
            
            function onMouseMove(moveEvent) {
                updateSliderPosition(moveEvent.clientY);
            }
            
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Touch Events for Mobile compatibility
        track.addEventListener('touchstart', (e) => {
            updateSliderPosition(e.touches[0].clientY);
            
            function onTouchMove(moveEvent) {
                updateSliderPosition(moveEvent.touches[0].clientY);
            }
            
            function onTouchEnd() {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            }
            
            document.addEventListener('touchmove', onTouchMove, { passive: true });
            document.addEventListener('touchend', onTouchEnd);
        });
    });

    // Preset buttons click listeners
    eqPresetButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            eqPresetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.textContent.trim());
        });
    });

    // --- 5. FAQ ACCORDION TRANSITIONS ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const header = item.querySelector('.faq-question');
        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');
            
            // Close all active items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                const otherAnswer = otherItem.querySelector('.faq-answer');
                otherAnswer.style.maxHeight = null;
            });

            // Toggle current clicked item
            if (!isOpen) {
                item.classList.add('active');
                const answer = item.querySelector('.faq-answer');
                // Set max-height dynamically to content height to trigger transition
                answer.style.maxHeight = `${answer.scrollHeight}px`;
            }
        });
    });
});
