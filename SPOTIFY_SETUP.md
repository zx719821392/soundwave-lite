# 🎵 SoundWave 集成 Spotify - 快速配置指南

## 为什么用 Spotify？

✅ **音频稳定可靠** - 官方 API，预览 URL 永不失效  
✅ **全球库存** - 7000 万+ 高质量歌曲  
✅ **免费配额** - 180 万 API 请求/月（足够小规模应用）  
✅ **简单集成** - Bearer Token 认证，无 CORS 问题  

---

## 第 1 步：创建 Spotify 开发者账户

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 使用 Spotify 账户登录（没有的话先注册 https://www.spotify.com/signup）
3. 同意条款，进入 Dashboard

---

## 第 2 步：创建应用

1. 点击 **"Create an App"**
2. 填写应用信息：
   - **App name**: `SoundWave Lite`
   - **App description**: `Music streaming application`
   - 勾选 "I agree to Spotify Developer Terms"
3. 点击 **"Create"**
4. 复制以下两个凭证：
   - **Client ID**（客户端 ID）
   - **Client Secret**（客户端密钥）⚠️ 不要分享给任何人！

---

## 第 3 步：配置 Vercel 环境变量

### 方式 A：通过 Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 `soundwave-lite`
3. 进入 **Settings** → **Environment Variables**
4. 添加两个变量：

```
Key: SPOTIFY_CLIENT_ID
Value: [粘贴你的 Client ID]

Key: SPOTIFY_CLIENT_SECRET
Value: [粘贴你的 Client Secret]
```

5. 点击 **Save**

### 方式 B：通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没装）
npm install -g vercel

# 登录
vercel login

# 配置环境变量
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET

# 重新部署
vercel redeploy
```

---

## 第 4 步：推送代码更新

```bash
cd /Users/zhao2025/CodeBuddy/Claw/SoundWave-Export

# 确保已提交所有更改
git add .
git commit -m "Add Spotify API integration"

# 推送到 GitHub
git push origin main
```

Vercel 会自动检测推送，重新部署应用（1-2 分钟）。

---

## 第 5 步：验证集成

1. 访问 https://soundwave-lite.vercel.app
2. 点击 **"热门"** 标签页 → 应该看到 Spotify 热门歌曲 🎉
3. 在搜索框输入歌手名字（如 `Taylor Swift`）
4. 点击任意歌曲卡片，音乐应该能播放 ✅

---

## 常见问题

### Q: 显示 "Spotify 认证失败"
**A:** 检查环境变量是否正确配置：
```bash
vercel env ls
```
确保两个变量都存在。

### Q: 搜索结果为空
**A:** 可能是 Spotify API 返回无预览 URL 的歌曲。应用会自动过滤掉这些。试试搜索更热门的歌手。

### Q: 音频播放还是不行
**A:** 检查浏览器控制台（F12 → Console）是否有 CORS 错误。Spotify 的预览 URL 应该没有 CORS 限制。

### Q: API 配额超限
**A:** 免费配额是 180 万请求/月，大约每天 6 万。如果超限，升级为 Premium 计划。

---

## 技术细节

### 工作流程

```
用户搜索 → 前端调用 /api/search?keyword=xxx
         ↓
    API 获取 Spotify Token（缓存）
         ↓
    调用 Spotify Search API
         ↓
    返回含 preview_url 的歌曲
         ↓
    前端直接播放 preview_url（30秒预览）
```

### Spotify 预览 URL

- **格式**: `https://p.scdn.co/mp3-preview/xxxxx`
- **长度**: 30 秒（官方限制，免费 API）
- **质量**: 128kbps MP3
- **有效期**: 永久（与网易云/QQ 音乐不同）
- **CORS**: ✅ 支持跨域请求

---

## 下一步优化

可选增强功能（暂不需要）：

1. **用户认证** - 让用户登录 Spotify 账户，解锁完整歌曲播放
2. **Playlist 支持** - 从 Spotify 收藏或创建歌单
3. **Lyrics 集成** - 调用 Genius API 获取歌词
4. **推荐引擎** - 基于用户收藏的歌曲推荐相似曲目

---

**🎉 配置完成后，你的 SoundWave 应用就能稳定提供音乐搜索和播放了！**
