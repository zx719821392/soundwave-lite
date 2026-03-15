const axios = require('axios');

// Spotify API 配置
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyAccessToken = null;
let tokenExpiresAt = 0;

/**
 * 获取 Spotify 访问令牌
 */
async function getSpotifyToken() {
  try {
    // 检查缓存的令牌是否仍有效
    if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
      return spotifyAccessToken;
    }

    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    spotifyAccessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000 - 60000); // 提前 1 分钟刷新

    return spotifyAccessToken;
  } catch (error) {
    console.error('获取 Spotify 令牌失败:', error.message);
    throw new Error('Spotify 认证失败');
  }
}

/**
 * 搜索 Spotify 音乐
 */
async function searchSpotifyMusic(query, limit = 20) {
  try {
    const token = await getSpotifyToken();
    
    const response = await axios.get(
      'https://api.spotify.com/v1/search',
      {
        params: {
          q: query,
          type: 'track',
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      }
    );

    // 转换为统一格式
    return response.data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(' / '),
      album: track.album.name,
      image: track.album.images[0]?.url || '',
      duration: Math.floor(track.duration_ms / 1000),
      preview_url: track.preview_url,
      source: 'spotify'
    })).filter(t => t.preview_url); // 只返回有预览 URL 的曲目
  } catch (error) {
    console.error('Spotify 搜索失败:', error.message);
    return [];
  }
}

/**
 * 获取 Spotify 热门曲目
 */
async function getSpotifyTrending(limit = 20) {
  try {
    const token = await getSpotifyToken();
    
    const response = await axios.get(
      'https://api.spotify.com/v1/playlists/37i9dQZEVXbNG2KDcFcKOF', // Spotify 官方热门榜
      {
        params: { limit: limit },
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      }
    );

    return response.data.tracks.items.map(item => {
      const track = item.track;
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(' / '),
        album: track.album.name,
        image: track.album.images[0]?.url || '',
        duration: Math.floor(track.duration_ms / 1000),
        preview_url: track.preview_url,
        source: 'spotify'
      };
    }).filter(t => t.preview_url);
  } catch (error) {
    console.error('获取 Spotify 热门曲目失败:', error.message);
    return [];
  }
}

module.exports = {
  searchSpotifyMusic,
  getSpotifyTrending,
  getSpotifyToken
};
