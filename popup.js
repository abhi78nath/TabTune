// popup.js

// Lyrics modal elements
const lyricsModal = document.getElementById("lyricsModal");
const lyricsTitle = document.getElementById("lyricsTitle");
const lyricsContent = document.getElementById("lyricsContent");
const lyricsLoading = document.getElementById("lyricsLoading");
const lyricsError = document.getElementById("lyricsError");
const lyricsCloseBtn = document.getElementById("lyricsCloseBtn");

// Close modal handlers
lyricsCloseBtn.onclick = () => {
  lyricsModal.style.display = "none";
};

window.onclick = (event) => {
  if (event.target === lyricsModal) {
    lyricsModal.style.display = "none";
  }
};

// Show lyrics function
async function showLyrics(artist, title) {
  lyricsModal.style.display = "block";
  lyricsTitle.textContent = `${title} - ${artist}`;
  lyricsContent.style.display = "none";
  lyricsError.style.display = "none";
  lyricsLoading.style.display = "block";

  try {
    const result = await fetchLyrics(artist, title);
    
    lyricsLoading.style.display = "none";
    
    if (result.error) {
      lyricsError.textContent = result.error;
      lyricsError.style.display = "block";
    } else if (result.lyrics) {
      // Format lyrics with line breaks
      const formattedLyrics = result.lyrics.replace(/\n/g, "<br>");
      lyricsContent.innerHTML = formattedLyrics;
      lyricsContent.style.display = "block";
    } else {
      lyricsError.textContent = "No lyrics found";
      lyricsError.style.display = "block";
    }
  } catch (error) {
    lyricsLoading.style.display = "none";
    lyricsError.textContent = "Failed to load lyrics: " + error.message;
    lyricsError.style.display = "block";
  }
}

async function renderTabs(tabs = []) {
  const list = document.getElementById("list");
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

    // Title + hostname
    const info = document.createElement("div");
    info.className = "info";
    const isSpotify = tab.url && tab.url.includes('open.spotify.com');
    const spotifyDetails = spotifyData[tab.id];
    
    if (isSpotify && spotifyDetails && spotifyDetails.title) {
      info.innerHTML = `
        <strong>${spotifyDetails.title || tab.title || "Untitled"}</strong><br>
        <small>${spotifyDetails.artist || "Unknown Artist"}</small>
      `;
    } else {
      info.innerHTML = `
        <strong>${tab.title || "Untitled"}</strong><br>
        <small>${new URL(tab.url).hostname}</small>
      `;
    }

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    // Show Lyrics button (only for Spotify tabs with song details)
    if (isSpotify && spotifyDetails && spotifyDetails.title && spotifyDetails.artist) {
      const lyricsBtn = document.createElement("button");
      lyricsBtn.textContent = "🎵 Lyrics";
      lyricsBtn.className = "lyrics-btn";
      lyricsBtn.title = "Show lyrics for this song";
      lyricsBtn.onclick = async (e) => {
        e.stopPropagation();
        await showLyrics(spotifyDetails.artist, spotifyDetails.title);
      };
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
    li.onclick = () => {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    };

    li.appendChild(info);
    li.appendChild(buttonContainer);
    list.appendChild(li);
  });
}

// Load once
chrome.storage.local.get("playingTabs", (data) => {
  renderTabs(data.playingTabs);
});

// Listen to live updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "media-tabs-updated") {
    renderTabs(msg.tabs);
  }
});

// Refresh when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, () => {
  chrome.runtime.sendMessage({ action: "request-update" });
});
