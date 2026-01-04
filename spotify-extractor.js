// spotify-extractor.js
// Spotify song details extraction functionality

/**
 * Extracts song details from Spotify web player
 * This function is injected into Spotify tabs to read the DOM
 * @returns {Object} Song details object with title, artist, album, image, duration, progress
 */
function extractSpotifySongDetails() {
  // Spotify Web Player DOM selectors (these may change, but these are common ones)
  const songDetails = {
    title: null,
    artist: null,
    album: null,
    image: null,
    duration: null,
    progress: null
  };

  // Try multiple selectors as Spotify's DOM structure can vary
  // Method 1: Try data-testid selectors (common in modern Spotify)
  const titleElement = document.querySelector('[data-testid="entityTitle"]') || 
                      document.querySelector('[data-testid="context-item-info-title"]') ||
                      document.querySelector('a[data-testid="context-item-link"]') ||
                      document.querySelector('.now-playing-bar__left .track-info__name a') ||
                      document.querySelector('.track-info__name a');
  
  const artistElement = document.querySelector('[data-testid="context-item-info-artist"]') ||
                       document.querySelector('a[data-testid="context-item-info-artist"]') ||
                       document.querySelector('.now-playing-bar__left .track-info__artists a') ||
                       document.querySelector('.track-info__artists a');
  
  const imageElement = document.querySelector('[data-testid="entityImage"]') ||
                      document.querySelector('.now-playing-bar__left img') ||
                      document.querySelector('.cover-art img');
  
  const progressElement = document.querySelector('[data-testid="progress-bar"]') ||
                         document.querySelector('.playback-bar__progress');
  
  const durationElement = document.querySelector('[data-testid="duration-text"]') ||
                          document.querySelector('.playback-bar__progress-time:last-child');

  if (titleElement) {
    songDetails.title = titleElement.textContent?.trim() || titleElement.innerText?.trim();
  }

  if (artistElement) {
    songDetails.artist = artistElement.textContent?.trim() || artistElement.innerText?.trim();
  }

  if (imageElement) {
    songDetails.image = imageElement.src || imageElement.getAttribute('src');
  }

  if (progressElement) {
    const style = window.getComputedStyle(progressElement);
    songDetails.progress = style.width || progressElement.style.width;
  }

  if (durationElement) {
    songDetails.duration = durationElement.textContent?.trim() || durationElement.innerText?.trim();
  }

  // Also try to get from page title (fallback)
  if (!songDetails.title) {
    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes(' - ')) {
      const parts = pageTitle.split(' - ');
      if (parts.length >= 2) {
        songDetails.title = parts[0].trim();
        songDetails.artist = parts[1].replace(' | Spotify', '').trim();
      }
    }
  }

  return songDetails;
}

/**
 * Main function to get Spotify song details from a tab
 * This function runs in the service worker context
 * @param {number} tabId - The ID of the Spotify tab
 */
function getSpotifySongDetails(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: extractSpotifySongDetails
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('Error extracting Spotify details:', chrome.runtime.lastError.message);
      return;
    }
    
    if (results && results[0] && results[0].result) {
      const details = results[0].result;
      console.log('🎵 Spotify Song Details:', details);
      
      // Store song details in chrome.storage with tabId as key
      chrome.storage.local.set({ [`spotifyDetails_${tabId}`]: details });
    }
  });
}

