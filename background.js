// background.js (service worker)

// Import Spotify extraction functionality
importScripts('spotify-extractor.js');

let lastPlayingTabsHash = null;
let forceUpdate = false;

function updateMediaTabs() {
    chrome.tabs.query({}, (tabs) => {
      const playingTabs = tabs
        .filter(tab => tab.audible === true)
        .map(tab => ({
          id: tab.id,
          title: tab.title || "Untitled",
          url: tab.url,
          windowId: tab.windowId,
          audible: tab.audible,
          muted: tab.mutedInfo?.muted || false
        }));
  
      // Create a simple hash to detect actual changes
      // Include id, muted, audible, title, and url to catch song changes
      const currentHash = JSON.stringify(playingTabs.map(t => ({
        id: t.id,
        muted: t.muted,
        audible: t.audible,
        title: t.title,
        url: t.url
      })).sort((a, b) => a.id - b.id));

      // Only update if something actually changed (unless forced)
      if (!forceUpdate && currentHash === lastPlayingTabsHash && lastPlayingTabsHash !== null) {
        return; // No changes, skip update (but allow first update)
      }
      
      lastPlayingTabsHash = currentHash;
      forceUpdate = false; // Reset force flag
  
      // Check for Spotify tabs and get song details
      playingTabs.forEach(tab => {
        if (tab.url && tab.url.includes('open.spotify.com')) {
          getSpotifySongDetails(tab.id);
        }
      });
  
      // Optional: store in chrome.storage for popup to read quickly
      chrome.storage.local.set({ playingTabs });
  
      // You can also send message to popup or side panel if open
      chrome.runtime.sendMessage({
        action: "media-tabs-updated",
        tabs: playingTabs
      }).catch(err => {
        // Silently ignore — popup is probably just closed
        if (err.message.includes("Receiving end does not exist")) {
          // optional: console.debug("Popup not open, skipping update");
        } else {
          console.error("Unexpected sendMessage error:", err);
        }
      });
    });
  }
  
  // Update when something changes
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Most important fields for us
    if ("audible" in changeInfo || "mutedInfo" in changeInfo || changeInfo.status === "complete") {
      updateMediaTabs();
    }
  });
  
  // Also useful when tab becomes active
  chrome.tabs.onActivated.addListener(() => {
    updateMediaTabs();
  });
  
  // Initial load + when extension is installed/enabled
  chrome.runtime.onStartup.addListener(updateMediaTabs);
  chrome.runtime.onInstalled.addListener(updateMediaTabs);

  // Listen for Spotify details updates and trigger refresh
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      // Check if any Spotify details were updated
      const spotifyDetailChanged = Object.keys(changes).some(key => key.startsWith('spotifyDetails_'));
      if (spotifyDetailChanged) {
        // Force an update when Spotify details change (ignore hash check)
        forceUpdate = true;
        updateMediaTabs();
      }
    }
  });

  // Optional: update every ~5 seconds (the audible flag has a small delay anyway)
  // Reduced frequency since we now check for actual changes
  setInterval(updateMediaTabs, 5000);