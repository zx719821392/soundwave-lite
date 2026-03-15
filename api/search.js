/**
 * SoundWave 后端 API - 搜索接口
 * 集成 Spotify、QQ音乐 和 网易云 API
 * 部署在 Vercel Serverless Functions
 */

const axios = require('axios');
const { searchSpotifyMusic, getSpotifyTrending } = require('./spotify');

// ==================== API 配置 ====================

// 网易云 API 基础 URL（使用第三方公开代理）
const NETEASE_API = 'https://netease-cloud-music-api.vercel.app';

// QQ 音乐 API（通过反向工程获取）
const QQ_MUSIC_API = 'https://u.qcloud.la';

// 超时控制
const TIMEOUT = 8000;

// ==================== 工具函数 ====================

/**
 * 延迟函数（避免 API 限流）
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 从网易云搜索歌曲
 */
async function searchNetease(keyword) {
  try {
    const response = await axios.get(`${NETEASE_API}/search`, {
      params: {
        keywords: keyword,
        type: 1, // 搜索歌曲
        limit: 20
      },
      timeout: TIMEOUT
    });

    if (response.data.result && response.data.result.songs) {
      return response.data.result.songs.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.artists?.map(a => a.name).join(' / ') || '未知歌手',
        album: song.album?.name || '未知专辑',
        cover: song.album?.picUrl || '🎵',
        duration: Math.floor((song.duration || 0) / 1000),
        source: 'netease',
        audioUrl: `/api/proxy?id=${song.id}&source=netease`,
        playCount: song.popularity || 0
      }));
    }
  } catch (error) {
    console.error('网易云搜索失败:', error.message);
  }
  return [];
}

/**
 * 从 QQ 音乐搜索歌曲
 */
async function searchQQMusic(keyword) {
  try {
    const response = await axios.get(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp`, {
      params: {
        aggr: 1,
        cr: 1,
        flag_qc: 0,
        p: 1,
        n: 20,
        w: keyword,
        g_tk: 5381,
        jsonpCallback: 'SearchCpCallback',
        format: 'jsonp'
      },
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // 处理 JSONP 响应
    let jsonData = response.data;
    if (jsonData.includes('SearchCpCallback')) {
      jsonData = jsonData.replace('SearchCpCallback(', '').replace(');', '');
      jsonData = JSON.parse(jsonData);
    }

    if (jsonData.data && jsonData.data.song && jsonData.data.song.list) {
      return jsonData.data.song.list.slice(0, 20).map(song => ({
        id: song.songid,
        title: song.songname,
        artist: song.singer?.map(s => s.name).join(' / ') || '未知歌手',
        album: song.albummname || '未知专辑',
        cover: song.albumpic_mid 
          ? `https://p.music.126.net/${song.albumpic_mid}/109951165306831105.jpg`
          : '🎵',
        duration: song.interval || 0,
        source: 'qq',
        audioUrl: `/api/proxy?id=${song.songid}&source=qq`,
        playCount: 0
      }));
    }
  } catch (error) {
    console.error('QQ 音乐搜索失败:', error.message);
  }
  return [];
}

/**
 * 获取热门歌曲
 */
async function getTrending() {
  try {
    const response = await axios.get(`${NETEASE_API}/top/song`, {
      params: {
        type: 0,
        limit: 20
      },
      timeout: TIMEOUT
    });

    if (response.data.data) {
      return response.data.data.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.ar?.map(a => a.name).join(' / ') || '未知歌手',
        album: song.al?.name || '未知专辑',
        cover: song.al?.picUrl || '🎵',
        duration: Math.floor((song.dt || 0) / 1000),
        source: 'netease',
        audioUrl: `/api/proxy?id=${song.id}&source=netease`,
        playCount: song.pop || 0
      }));
    }
  } catch (error) {
    console.error('获取热门歌曲失败:', error.message);
  }
  return [];
}

// ==================== 主要 API 端点 ====================

module.exports = async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { keyword, action } = req.query;

    // 搜索歌曲 - 优先 Spotify
    if (action === 'search' && keyword) {
      let spotifyResults = [];
      let neteaseResults = [];
      let qqResults = [];

      try {
        spotifyResults = await searchSpotifyMusic(keyword, 15);
      } catch (e) {
        console.warn('Spotify 搜索失败，尝试备选源');
      }

      // 如果 Spotify 结果不足，补充网易云和 QQ 音乐
      if (spotifyResults.length < 10) {
        try {
          neteaseResults = await searchNetease(keyword);
          await delay(200);
          qqResults = await searchQQMusic(keyword);
        } catch (e) {
          console.warn('备选源搜索失败');
        }
      }

      // 合并结果，优先 Spotify（有音频）
      const allResults = [...spotifyResults, ...neteaseResults, ...qqResults];
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.title + item.artist, item])).values()
      );

      return res.status(200).json({
        success: true,
        data: uniqueResults.slice(0, 30),
        total: uniqueResults.length
      });
    }

    // 获取热门歌曲 - 优先 Spotify
    if (action === 'trending') {
      let trending = [];

      try {
        trending = await getSpotifyTrending(30);
      } catch (e) {
        console.warn('Spotify 热门歌曲获取失败，尝试备选源');
        trending = await getTrending();
      }

      return res.status(200).json({
        success: true,
        data: trending,
        total: trending.length
      });
    }

    // 默认返回
    return res.status(400).json({
      success: false,
      error: '缺少必要参数：action 和 keyword'
    });
  } catch (error) {
    console.error('API 错误:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
