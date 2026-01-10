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
    console.error('Error fetching lyrics:', error);
    return { error: error.message || 'Failed to fetch lyrics' };
  }
}

