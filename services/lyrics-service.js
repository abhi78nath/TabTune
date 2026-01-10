// lyrics-service.js
// Service for fetching lyrics from external API

/**
 * Fetches lyrics from lyrics.ovh API
 * @param {string} artist - The artist name
 * @param {string} title - The song title
 * @returns {Promise<Object>} Promise that resolves to lyrics data or error
 */
async function fetchLyrics(artist, title) {
  if (!artist || !title) {
    return { error: 'Artist and title are required' };
  }

  // Try primary source first
  try {
    const primaryResult = await fetchFromPrimary(artist, title);
    if (primaryResult && primaryResult.lyrics) {
      return primaryResult;
    }
  } catch (error) {
    console.warn('Primary lyrics source failed:', error);
  }

  // Fallback to secondary source
  return await fetchFromSecondary(artist, title);
}

async function fetchFromPrimary(artist, title) {
  const encodedArtist = encodeURIComponent(artist.trim());
  const encodedTitle = encodeURIComponent(title.trim());
  
  // Note: API expects "song" parameter instead of "title" in query string, but based on URL provided 
  // https://test-0k.onrender.com/lyrics/?artist=Coldplay&song=Yellow
  const apiUrl = `https://test-0k.onrender.com/lyrics/?artist=${encodedArtist}&song=${encodedTitle}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Primary API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Map response format: {"status":"success", "data": {"lyrics": "..."}}
  if (data.status === 'success' && data.data && data.data.lyrics) {
    return { lyrics: data.data.lyrics };
  }
  
  return null;
}

async function fetchFromSecondary(artist, title) {
  // Clean the artist and title for URL encoding
  const encodedArtist = encodeURIComponent(artist.trim());
  const encodedTitle = encodeURIComponent(title.trim());
  
  const apiUrl = `https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Lyrics not found for this song' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lyrics from secondary source:', error);
    return { error: error.message || 'Failed to fetch lyrics' };
  }
}

