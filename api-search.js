// Vercel Serverless Function - 歌曲搜索 API
// 路径: api/search.js
// 调用: GET /api/search?q=keyword

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: '请输入搜索关键词' });
  }

  try {
    // 方案 1: QQ 音乐搜索 API
    const qqResponse = await fetch(
      `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?` +
      `w=${encodeURIComponent(q)}&` +
      `format=json&` +
      `p=1&` +
      `n=10&` +
      `platform=yqq`
    );

    const qqData = await qqResponse.json();

    // 提取歌曲信息
    const songs = qqData.data?.song?.list?.map(item => ({
      id: item.songid,
      title: item.songname,
      artist: item.singer?.[0]?.name || '未知歌手',
      album: item.albumname,
      duration: item.interval,
      cover: item.albumpic || 'default'
    })) || [];

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json({
      success: true,
      data: songs,
      total: songs.length
    });
  } catch (error) {
    console.error('搜索失败:', error);
    return res.status(500).json({
      error: '搜索失败，请稍后重试',
      message: error.message
    });
  }
}
