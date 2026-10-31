const config = require('@root/config');
const Logger = require('./Logger');

class SpotifyManager {
  constructor() {
    this.baseUrl = 'https://api.spotify.com/v1';
    this.clientId = config.SpotifyID;
    this.clientSecret = config.SpotifySecret;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      if (!this.clientId || !this.clientSecret) {
        Logger.log('Spotify credentials not configured', 'error');
        return null;
      }

      const tokenEndpoint = 'https://accounts.spotify.com/api/token';
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const data = await response.json();

      if (data?.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
        return this.accessToken;
      }

      Logger.log(`Failed to get access token: ${response.status} ${response.statusText}`, 'error');
      return null;
    } catch (err) {
      Logger.log(`Error getting access token: ${err?.message || err}`, 'error');
      return null;
    }
  }

  async apiRequest(endpoint, method = 'GET') {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        Logger.log(`Spotify API request failed: ${response.status} ${response.statusText}`, 'error');
        return null;
      }
      return await response.json();
    } catch (err) {
      Logger.log(`Spotify API request error for ${endpoint}: ${err?.message || err}`, 'error');
      return null;
    }
  }

  parseSpotifyUrl(url) {
    try {
      const patterns = {
        playlist: /spotify\.com\/playlist\/([\dA-Za-z]+)/,
        user: /spotify\.com\/user\/([\dA-Za-z]+)/,
        track: /spotify\.com\/track\/([\dA-Za-z]+)/,
        album: /spotify\.com\/album\/([\dA-Za-z]+)/,
      };
      for (const [type, pattern] of Object.entries(patterns)) {
        const match = url.match(pattern);
        if (match) return { id: match[1], type };
      }
      return null;
    } catch (err) {
      Logger.log(`Error parsing Spotify URL: ${err?.message || err}`, 'error');
      return null;
    }
  }

  async fetchUserData(profileUrl) {
    const parsed = this.parseSpotifyUrl(profileUrl);
    if (!parsed || parsed.type !== 'user') return null;
    const data = await this.apiRequest(`/users/${parsed.id}`);
    if (!data) return null;
    return {
      id: data.id,
      displayName: data.display_name || data.id,
      url: data.external_urls?.spotify || profileUrl,
      images: data.images || [],
    };
  }

  async fetchUserPlaylists(profileUrl) {
    const parsed = this.parseSpotifyUrl(profileUrl);
    if (!parsed || parsed.type !== 'user') return null;
    const userData = await this.fetchUserData(profileUrl);
    if (!userData) return null;
    const data = await this.apiRequest(`/users/${parsed.id}/playlists?limit=50`);
    if (!data?.items) return [];
    return data.items
      .filter(pl => pl.public && pl.tracks?.total > 0)
      .map(pl => ({
        id: pl.id,
        name: pl.name,
        url: pl.external_urls?.spotify,
        coverUrl: pl.images?.[0]?.url,
        trackCount: pl.tracks?.total || 0,
        owner: pl.owner?.display_name || pl.owner?.id,
      }));
  }

  async fetchPlaylistTracks(playlistId, cap = 300) {
    try {
      const tracks = [];
      let offset = 0;

      while (offset < cap) {
        const data = await this.apiRequest(
          `/playlists/${playlistId}/tracks?limit=50&offset=${offset}`
        );
        if (!data?.items?.length) break;
        for (const item of data.items) {
          if (!item.track || item.track.is_local) continue;
          const t = item.track;
          tracks.push({
            name: t.name,
            artist: Array.isArray(t.artists) ? t.artists.map(a => a.name).join(', ') : 'Unknown',
            duration: t.duration_ms || 0,
            url: t.external_urls?.spotify || '',
          
          });
        }

        offset += data.items.length;
        if (data.items.length < 50) break;
      }
      return tracks.slice(0, cap);
    } catch (err) {
      Logger.log(`Error fetching playlist tracks: ${err?.message || err}`, 'error');
      return [];
    }
  }
}

module.exports = new SpotifyManager();
