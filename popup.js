// popup.js

// Cache for loaded lyrics to avoid reloading
const lyricsCache = new Map();

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
    li.className = tab.muted ? "muted" : "playing";
    li.title = tab.url;

    // Title + hostname + image
    const info = document.createElement("div");
    info.className = "info";
    const isSpotify = tab.url && tab.url.includes('open.spotify.com');
    const spotifyDetails = spotifyData[tab.id];
    
    if (isSpotify && spotifyDetails && spotifyDetails.title) {
      // Create image element if available
      let imageHtml = '';
      if (spotifyDetails.image) {
        imageHtml = `<img src="${spotifyDetails.image}" alt="Album cover" class="album-image" />`;
      }
      info.innerHTML = `
        ${imageHtml}
        <div class="info-text">
          <strong>${spotifyDetails.title || tab.title || "Untitled"}</strong><br>
          <small>${spotifyDetails.artist || "Unknown Artist"}</small>
        </div>
      `;
    } else {
      info.innerHTML = `
        <div class="info-text">
          <strong>${tab.title || "Untitled"}</strong><br>
          <small>${new URL(tab.url).hostname}</small>
        </div>
      `;
    }

    // Create main content row (info + buttons)
    const mainRow = document.createElement("div");
    mainRow.className = "media-row";

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    // Show Lyrics button (only for Spotify tabs with song details)
    let lyricsPanel = null;
    if (isSpotify && spotifyDetails && spotifyDetails.title && spotifyDetails.artist) {
      const lyricsBtn = document.createElement("button");
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
          // Restore from cache - no need to reload
          loadingEl.style.display = "none";
          contentEl.innerHTML = loadedLyrics.get(tab.id);
          contentEl.style.display = "block";
          errorEl.style.display = "none";
          lyricsPanel.dataset.loaded = "true";
        } else {
          // Load lyrics if not cached
          loadingEl.style.display = "block";
          contentEl.style.display = "none";
          errorEl.style.display = "none";
          
          // Create cache key
          const cacheKey = `${spotifyDetails.artist}|${spotifyDetails.title}`;
          
          // Check global cache first
          if (lyricsCache.has(cacheKey)) {
            const cachedLyrics = lyricsCache.get(cacheKey);
            loadingEl.style.display = "none";
            contentEl.innerHTML = cachedLyrics;
            contentEl.style.display = "block";
            lyricsPanel.dataset.loaded = "true";
          } else {
            // Load lyrics asynchronously
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
                // Cache the lyrics
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
        // Update button text based on state
        const isExpanded = lyricsPanel.classList.contains("expanded");
        lyricsBtn.textContent = isExpanded ? "🎵 Hide Lyrics" : "🎵 Lyrics";
      };
      
      // Update button text if panel is expanded
      if (expandedPanels.has(tab.id)) {
        lyricsBtn.textContent = "🎵 Hide Lyrics";
      }
      
      buttonContainer.appendChild(lyricsBtn);
    }

    // Mute toggle button
    const muteBtn = document.createElement("button");
    muteBtn.textContent = tab.muted ? "Unmute 🔊" : "Mute 🔇";
    muteBtn.className = "mute-btn";
    muteBtn.title = tab.muted ? "Unmute this tab" : "Mute this tab";

    muteBtn.onclick = async (e) => {
      e.stopPropagation(); // Prevent li click (focus tab)
      try {
        await chrome.tabs.update(tab.id, { muted: !tab.muted });
        // The tab will update → onUpdated listener in background will refresh storage → popup gets message → re-renders
      } catch (err) {
        console.error("Failed to toggle mute:", err);
      }
    };

    buttonContainer.appendChild(muteBtn);

    // Click anywhere else on the row → focus the tab
    mainRow.onclick = () => {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    };

    mainRow.appendChild(info);
    mainRow.appendChild(buttonContainer);
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
