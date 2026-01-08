// popup.js

// Helper function to parse time string (e.g., "3:45") to seconds
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return 0;
}

// Helper function to format seconds to time string (e.g., "3:45")
function formatTime(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Cache for loaded lyrics to avoid reloading
const lyricsCache = new Map();
// Track progress intervals
const progressIntervals = new Map();

// Debounce function to prevent excessive re-renders
let renderTimeout = null;
function debouncedRenderTabs(tabs) {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }
  renderTimeout = setTimeout(() => {
    renderTabs(tabs);
  }, 300); // Wait 300ms before rendering
}

// Toggle lyrics panel function
async function toggleLyricsPanel(panelElement, artist, title) {
  const isExpanded = panelElement.classList.contains("expanded");
  
  if (isExpanded) {
    // Collapse panel
    panelElement.classList.remove("expanded");
  } else {
    // Expand panel and load lyrics if not already loaded
    panelElement.classList.add("expanded");
    
    const loadingEl = panelElement.querySelector(".lyrics-loading");
    const contentEl = panelElement.querySelector(".lyrics-content");
    const errorEl = panelElement.querySelector(".lyrics-error");
    
    // Only load if not already loaded
    if (!panelElement.dataset.loaded) {
      loadingEl.style.display = "block";
      contentEl.style.display = "none";
      errorEl.style.display = "none";

      // Check cache first
      const cacheKey = `${artist}|${title}`;
      if (lyricsCache.has(cacheKey)) {
        const cachedLyrics = lyricsCache.get(cacheKey);
        loadingEl.style.display = "none";
        contentEl.innerHTML = cachedLyrics;
        contentEl.style.display = "block";
        panelElement.dataset.loaded = "true";
      } else {
        try {
          const result = await fetchLyrics(artist, title);
          
          loadingEl.style.display = "none";
          
          if (result.error) {
            errorEl.textContent = result.error;
            errorEl.style.display = "block";
          } else if (result.lyrics) {
            // Format lyrics with line breaks
            const formattedLyrics = result.lyrics.replace(/\n/g, "<br>");
            contentEl.innerHTML = formattedLyrics;
            contentEl.style.display = "block";
            panelElement.dataset.loaded = "true";
            // Cache the lyrics
            lyricsCache.set(cacheKey, formattedLyrics);
          } else {
            errorEl.textContent = "No lyrics found";
            errorEl.style.display = "block";
          }
        } catch (error) {
          loadingEl.style.display = "none";
          errorEl.textContent = "Failed to load lyrics: " + error.message;
          errorEl.style.display = "block";
        }
      }
    }
  }
}

async function renderTabs(tabs = []) {
  const list = document.getElementById("list");
  
  // Clear any running progress intervals before re-rendering
  progressIntervals.forEach(interval => clearInterval(interval));
  progressIntervals.clear();
  
  // Save expanded panel states and loaded lyrics before clearing
  const expandedPanels = new Map();
  const loadedLyrics = new Map();
  if (list.children.length > 0) {
    list.querySelectorAll('.lyrics-panel.expanded').forEach(panel => {
      const tabId = panel.dataset.tabId;
      if (tabId) {
        const id = parseInt(tabId);
        expandedPanels.set(id, true);
        // Save loaded lyrics content if available
        const contentEl = panel.querySelector(".lyrics-content");
        if (contentEl && contentEl.style.display !== "none" && contentEl.innerHTML) {
          loadedLyrics.set(id, contentEl.innerHTML);
        }
      }
    });
  }
  
  list.innerHTML = "";

  if (tabs.length === 0) {
    list.innerHTML = "<li>No tabs playing media right now</li>";
    return;
  }

  // Load all Spotify details at once
  const spotifyKeys = tabs
    .filter(tab => tab.url && tab.url.includes('open.spotify.com'))
    .map(tab => `spotifyDetails_${tab.id}`);
  
  const spotifyData = {};
  if (spotifyKeys.length > 0) {
    const stored = await chrome.storage.local.get(spotifyKeys);
    Object.keys(stored).forEach(key => {
      const tabId = key.replace('spotifyDetails_', '');
      spotifyData[tabId] = stored[key];
    });
  }

  tabs.forEach((tab) => {
    const li = document.createElement("li");
    // Set class based on state: paused > muted > playing
    if (tab.paused) {
      li.className = "paused";
    } else if (tab.muted) {
      li.className = "muted";
    } else {
      li.className = "playing";
    }
    li.title = tab.url;

    // Mute button (top right corner)
    const muteBtn = document.createElement("button");
    muteBtn.textContent = tab.muted ? "🔊" : "🔇";
    muteBtn.className = "mute-btn";
    muteBtn.title = tab.muted ? "Unmute this tab" : "Mute this tab";

    muteBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await chrome.tabs.update(tab.id, { muted: !tab.muted });
      } catch (err) {
        console.error("Failed to toggle mute:", err);
      }
    };
    
    li.appendChild(muteBtn);

    // Title + hostname + image
    const info = document.createElement("div");
    info.className = "info";
    const isSpotify = tab.url && tab.url.includes('open.spotify.com');
    const spotifyDetails = spotifyData[tab.id];
    
    if (isSpotify && spotifyDetails && spotifyDetails.title) {
      // Create info text container
      const infoText = document.createElement("div");
      infoText.className = "info-text";
      
      const titleEl = document.createElement("strong");
      titleEl.textContent = spotifyDetails.title || tab.title || "Untitled";
      infoText.appendChild(titleEl);
      
      infoText.appendChild(document.createElement("br"));
      
      const artistEl = document.createElement("small");
      artistEl.textContent = spotifyDetails.artist || "Unknown Artist";
      infoText.appendChild(artistEl);
      
      if (tab.paused) {
        infoText.appendChild(document.createElement("br"));
        const pausedEl = document.createElement("small");
        pausedEl.style.cssText = "color: #888; font-style: italic;";
        pausedEl.innerHTML = "⏸ Paused";
        infoText.appendChild(pausedEl);
      }

      // Create image element if available
      if (spotifyDetails.image) {
        const img = document.createElement("img");
        img.crossOrigin = "Anonymous";
        img.src = spotifyDetails.image;
        img.alt = "Album cover";
        img.className = "album-image";
        
        img.onload = () => {
          // Get the most dominant color for the background
          const dominantColors = getDominantColors(img, 1, 'desc');
          
          // Get the least dominant colors for the text (accents)
          const leastColors = getDominantColors(img, 3, 'asc');
          
          if (dominantColors && dominantColors.length > 0) {
            const primary = dominantColors[0];
            const { r, g, b } = primary;
            
            // Set background to primary (most dominant) color
            li.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            li.style.backgroundImage = 'none';
            li.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
            
            // Use the new accessible color generator
            const finalTextColor = getReadableTextColor(primary, leastColors || []);
            
            // Apply text colors
            li.style.color = finalTextColor;
            titleEl.style.color = finalTextColor;
            artistEl.style.color = finalTextColor;
            artistEl.style.opacity = "0.9";
            
            // Update paused indicator
            const pausedIndicator = infoText.querySelector("small[style*='italic']");
            if (pausedIndicator) {
              pausedIndicator.style.color = finalTextColor;
              pausedIndicator.style.opacity = "0.8";
            }
            
            // Update mute button color
            muteBtn.style.color = finalTextColor;
            
            // Update play/pause button color (SVG will inherit via currentColor)
            const playPauseBtn = li.querySelector('.play-pause-btn');
            if (playPauseBtn) {
              playPauseBtn.style.color = finalTextColor;
            }

            // Update progress time colors to match readable text color
            const progressTimeCurrent = li.querySelector('.progress-time-current');
            const progressTimeTotal = li.querySelector('.progress-time-total');
            if (progressTimeCurrent) progressTimeCurrent.style.color = finalTextColor;
            if (progressTimeTotal) progressTimeTotal.style.color = finalTextColor;
          }
        };
        
        info.appendChild(img);
      }
      
      info.appendChild(infoText);
    } else {
      const pausedIndicator = tab.paused ? '<br><small style="color: #888; font-style: italic;">⏸ Paused</small>' : '';
      info.innerHTML = `
        <div class="info-text">
          <strong>${tab.title || "Untitled"}</strong><br>
          <small>${new URL(tab.url).hostname}</small>${pausedIndicator}
        </div>
      `;
    }

    // Create progress bar for Spotify tabs with progress data
    let progressBar = null;
    if (isSpotify && spotifyDetails && spotifyDetails.duration) {
      progressBar = document.createElement("div");
      progressBar.className = "progress-container";
      
      let progressPercent = 0;
      let currentTimeDisplay = "0:00";
      
      // Use currentTime directly from Spotify if available
      let currentSeconds = 0;
      const totalSeconds = parseTimeToSeconds(spotifyDetails.duration);
      
      if (spotifyDetails.currentTime) {
        currentTimeDisplay = spotifyDetails.currentTime;
        currentSeconds = parseTimeToSeconds(spotifyDetails.currentTime);
        if (totalSeconds > 0) {
          progressPercent = (currentSeconds / totalSeconds) * 100;
        }
      } else if (spotifyDetails.progress) {
        // Fallback: parse progress percentage
        progressPercent = parseFloat(spotifyDetails.progress) || 0;
        currentSeconds = Math.floor((progressPercent / 100) * totalSeconds);
        currentTimeDisplay = formatTime(currentSeconds);
      }
      
      const progressBarId = `progress-${tab.id}`;
      progressBar.innerHTML = `
        <div class="progress-bar-wrapper">
          <div id="${progressBarId}-fill" class="progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="progress-times">
          <span id="${progressBarId}-time" class="progress-time-current">${currentTimeDisplay}</span>
          <span class="progress-time-total">${spotifyDetails.duration}</span>
        </div>
      `;

      // Start local simulation if playing
      if (!tab.paused && totalSeconds > 0) {
        // Clear any existing interval for this tab just in case
        if (progressIntervals.has(tab.id)) {
          clearInterval(progressIntervals.get(tab.id));
        }

        const interval = setInterval(() => {
          currentSeconds++;
          
          if (currentSeconds > totalSeconds) {
            clearInterval(interval);
            progressIntervals.delete(tab.id);
            return;
          }

          // Update DOM directly
          const fillEl = document.getElementById(`${progressBarId}-fill`);
          const timeEl = document.getElementById(`${progressBarId}-time`);
          
          if (fillEl && timeEl) {
            const newPercent = (currentSeconds / totalSeconds) * 100;
            fillEl.style.width = `${newPercent}%`;
            timeEl.textContent = formatTime(currentSeconds);
          } else {
            // Element no longer exists, clear interval
            clearInterval(interval);
            progressIntervals.delete(tab.id);
          }
        }, 1000);
        
        progressIntervals.set(tab.id, interval);
      }
    }

    // Create main content row (info)
    const mainRow = document.createElement("div");
    mainRow.className = "media-row";

    // Show Lyrics button (only for Spotify tabs with song details)
    let lyricsPanel = null;
    let lyricsBtn = null;
    if (isSpotify && spotifyDetails && spotifyDetails.title && spotifyDetails.artist) {
      lyricsBtn = document.createElement("button");
      lyricsBtn.textContent = "🎵 Lyrics";
      lyricsBtn.className = "lyrics-btn";
      lyricsBtn.title = "Toggle lyrics for this song";
      
      // Create lyrics panel
      lyricsPanel = document.createElement("div");
      lyricsPanel.className = "lyrics-panel";
      lyricsPanel.dataset.tabId = tab.id;
      lyricsPanel.innerHTML = `
        <div class="lyrics-loading">Loading lyrics...</div>
        <div class="lyrics-content"></div>
        <div class="lyrics-error"></div>
      `;
      
      // Restore expanded state if it was previously expanded
      if (expandedPanels.has(tab.id)) {
        lyricsPanel.classList.add("expanded");
        const loadingEl = lyricsPanel.querySelector(".lyrics-loading");
        const contentEl = lyricsPanel.querySelector(".lyrics-content");
        const errorEl = lyricsPanel.querySelector(".lyrics-error");
        
        // Check if we have cached lyrics for this tab
        if (loadedLyrics.has(tab.id)) {
          loadingEl.style.display = "none";
          contentEl.innerHTML = loadedLyrics.get(tab.id);
          contentEl.style.display = "block";
          errorEl.style.display = "none";
          lyricsPanel.dataset.loaded = "true";
        } else {
          loadingEl.style.display = "block";
          contentEl.style.display = "none";
          errorEl.style.display = "none";
          
          const cacheKey = `${spotifyDetails.artist}|${spotifyDetails.title}`;
          
          if (lyricsCache.has(cacheKey)) {
            const cachedLyrics = lyricsCache.get(cacheKey);
            loadingEl.style.display = "none";
            contentEl.innerHTML = cachedLyrics;
            contentEl.style.display = "block";
            lyricsPanel.dataset.loaded = "true";
          } else {
            fetchLyrics(spotifyDetails.artist, spotifyDetails.title).then(result => {
              loadingEl.style.display = "none";
              if (result.error) {
                errorEl.textContent = result.error;
                errorEl.style.display = "block";
              } else if (result.lyrics) {
                const formattedLyrics = result.lyrics.replace(/\n/g, "<br>");
                contentEl.innerHTML = formattedLyrics;
                contentEl.style.display = "block";
                lyricsPanel.dataset.loaded = "true";
                lyricsCache.set(cacheKey, formattedLyrics);
              } else {
                errorEl.textContent = "No lyrics found";
                errorEl.style.display = "block";
              }
            }).catch(error => {
              loadingEl.style.display = "none";
              errorEl.textContent = "Failed to load lyrics: " + error.message;
              errorEl.style.display = "block";
            });
          }
        }
      }
      
      lyricsBtn.onclick = async (e) => {
        e.stopPropagation();
        await toggleLyricsPanel(lyricsPanel, spotifyDetails.artist, spotifyDetails.title);
        const isExpanded = lyricsPanel.classList.contains("expanded");
        lyricsBtn.textContent = isExpanded ? "🎵 Hide Lyrics" : "🎵 Lyrics";
      };
      
      if (expandedPanels.has(tab.id)) {
        lyricsBtn.textContent = "🎵 Hide Lyrics";
      }
    }

    // Play/Pause button (will be placed below progress bar)
    const playPauseBtn = document.createElement("button");
    const isPaused = tab.paused || !tab.audible;
    playPauseBtn.className = "play-pause-btn";
    playPauseBtn.title = isPaused ? "Resume playback" : "Pause playback";
    
    // Create div element for SVG mask icon
    const playPauseIcon = document.createElement("div");
    playPauseIcon.className = `play-pause-icon ${isPaused ? 'play' : 'pause'}`;
    playPauseBtn.appendChild(playPauseIcon);

    playPauseBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const spotifyBtn = document.querySelector('[data-testid="control-button-playpause"]');
            if (spotifyBtn) {
              spotifyBtn.click();
              return true;
            }

            const media = document.querySelectorAll('video, audio');
            let played = false;
            for (const m of media) {
              if (!m.paused) {
                m.pause();
              } else {
                m.play();
                played = true;
              }
            }
            return played;
          }
        });
        
        // Update icon based on new state
        const icon = playPauseBtn.querySelector('.play-pause-icon');
        if (icon) {
          if (icon.classList.contains('play')) {
            icon.classList.remove('play');
            icon.classList.add('pause');
            playPauseBtn.title = "Pause playback";
          } else {
            icon.classList.remove('pause');
            icon.classList.add('play');
            playPauseBtn.title = "Resume playback";
          }
        }
      } catch (err) {
        console.error("Failed to toggle play/pause:", err);
      }
    };

    // Click anywhere else on the row → focus the tab
    mainRow.onclick = () => {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    };

    mainRow.appendChild(info);
    
    // Add progress bar and play/pause button container if available
    if (progressBar) {
      mainRow.appendChild(progressBar);
      
      // Create control row for play/pause button (below progress bar)
      const controlRow = document.createElement("div");
      controlRow.className = "control-row";
      controlRow.appendChild(playPauseBtn);
      
      // Add lyrics button if available
      if (lyricsBtn) {
        controlRow.appendChild(lyricsBtn);
      }
      
      mainRow.appendChild(controlRow);
    } else {
      // For non-Spotify tabs, add play/pause in a control row
      const controlRow = document.createElement("div");
      controlRow.className = "control-row";
      controlRow.appendChild(playPauseBtn);
      mainRow.appendChild(controlRow);
    }
    
    li.appendChild(mainRow);
    
    // Add lyrics panel if it exists
    if (lyricsPanel) {
      li.appendChild(lyricsPanel);
    }
    
    list.appendChild(li);
  });
}

// Load once (no debounce for initial load)
chrome.storage.local.get("playingTabs", (data) => {
  renderTabs(data.playingTabs || []);
});

// Listen to live updates with debouncing
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "media-tabs-updated") {
    debouncedRenderTabs(msg.tabs);
  }
});

// Refresh when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, () => {
  chrome.runtime.sendMessage({ action: "request-update" });
});
