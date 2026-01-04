// background.js (service worker)

// Import Spotify extraction functionality
importScripts('spotify-extractor.js');

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
  
  // Optional: update every ~3–5 seconds (the audible flag has a small delay anyway)
  setInterval(updateMediaTabs, 4000);