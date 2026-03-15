/**
 * SoundWave 后端 API - 音频代理接口
 * 获取真实的音频流 URL
 */

import axios from 'axios';

const TIMEOUT = 10000;

/**
 * 获取网易云音频 URL
 */
async function getNeteaseAudioUrl(id) {
  try {
    const response = await axios.get(
      `https://netease-cloud-music-api.vercel.app/song/url`,
      {
        params: { id, br: 320000 },
        timeout: TIMEOUT
      }
    );

    if (response.data.data && response.data.data[0]) {
      const url = response.data.data[0].url;
      if (url) return url;
    }
  } catch (error) {
    console.error('获取网易云音频 URL 失败:', error.message);
  }
  return null;
}

/**
 * 获取 QQ 音乐音频 URL
 */
async function getQQAudioUrl(id) {
  try {
    // QQ 音乐的直接获取方式
    const response = await axios.get(
      `https://u.qcloud.la/get_url?id=${id}&type=qq`,
      { timeout: TIMEOUT }
    );

    if (response.data && response.data.url) {
      return response.data.url;
    }
  } catch (error) {
    console.error('获取 QQ 音乐音频 URL 失败:', error.message);
  }
  return null;
}

/**
 * 代理音频流
 */
async function proxyAudio(audioUrl, res) {
  try {
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'stream',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/'
      }
    });

    // 转发响应头
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Content-Length', response.headers['content-length']);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // 流式转发
    response.data.pipe(res);
  } catch (error) {
    console.error('代理音频失败:', error.message);
    res.status(500).json({ error: '无法获取音频' });
  }
}

// ==================== 主要端点 ====================

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id, source } = req.query;

    if (!id || !source) {
      return res.status(400).json({
        error: '缺少参数：id 和 source'
      });
    }

    let audioUrl = null;

    // 根据来源获取音频 URL
    if (source === 'netease') {
      audioUrl = await getNeteaseAudioUrl(id);
    } else if (source === 'qq') {
      audioUrl = await getQQAudioUrl(id);
    }

    // 如果没有获取到 URL，返回错误
    if (!audioUrl) {
      return res.status(404).json({
        error: '无法获取该歌曲的音频URL'
      });
    }

    // 代理音频
    await proxyAudio(audioUrl, res);
  } catch (error) {
    console.error('代理端点错误:', error);
    return res.status(500).json({
      error: '服务器错误'
    });
  }
}
