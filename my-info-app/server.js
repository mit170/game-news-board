import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const parser = new Parser({
  headers: {
    'User-Agent': 'GameVault News Crawler/1.0',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});

app.use(cors());

// 取得先RSSフィードのリスト（アナログゲーム関連ニュースなど）
const RSS_FEEDS = [
  { url: 'https://tgiw.info/feed', sourceName: 'Table Games in the World', pages: 5, defaultGenre: 'boardgame' },
  { url: 'https://automaton-media.com/feed/', sourceName: 'AUTOMATON', pages: 5, filterMode: 'strict' },
  { url: 'https://www.4gamer.net/rss/index.xml', sourceName: '4Gamer.net', pages: 5, filterMode: 'strict' },
  { url: 'https://jp.ign.com/feed.xml', sourceName: 'IGN Japan', pages: 3, filterMode: 'strict' },
  { url: 'https://www.inside-games.jp/rss/index.rdf', sourceName: 'インサイド', pages: 3, filterMode: 'strict' },
  { url: 'https://news.google.com/rss/search?q=%E8%AC%8E%E8%A7%A3%E3%81%8D+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'escape_game' },
  { url: 'https://news.google.com/rss/search?q=%E3%83%AA%E3%82%A2%E3%83%AB%E8%84%B1%E5%87%BA%E3%82%B2%E3%83%BC%E3%83%A0+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'escape_game' },
  { url: 'https://news.google.com/rss/search?q=%E3%83%9E%E3%83%BC%E3%83%80%E3%83%BC%E3%83%9F%E3%82%B9%E3%83%86%E3%83%AA%E3%83%BC+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'murder_mystery' },
  { url: 'https://news.google.com/rss/search?q=TRPG+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'trpg' }
];

// TRPG等の記事が運悪くRSSから1件も取得できなかった場合の「絶対表示される保険データ」
const SEED_NEWS = [
  {
    id: `news-seed-trpg-1`,
    title: '【TRPG】新クトゥルフ神話TRPG 最新サプリメントが発売決定！現代日本を舞台にした探索がさらに充実',
    genre: 'trpg',
    genreLabel: 'TRPG',
    date: '2026.05.20',
    source: 'TRPGニュース速報',
    sourceUrl: 'https://www.google.com/search?q=新クトゥルフ神話TRPG+サプリメント',
    description: 'KADOKAWAより新クトゥルフ神話TRPGの最新追加データ集が発表されました。現代日本の職業や特徴を追加する、TRPGファン必携のサプリメントです。',
    tags: ['新製品', 'クトゥルフ', 'KADOKAWA']
  },
  {
    id: `news-seed-trpg-2`,
    title: '【TRPG】グループSNEより、初心者向け会話型RPG『負け残り厄カワヒロインTRPG』が好評発売中',
    genre: 'trpg',
    genreLabel: 'TRPG',
    date: '2026.05.15',
    source: 'TRPGニュース速報',
    sourceUrl: 'https://www.google.com/search?q=負け残り厄カワヒロインTRPG',
    description: 'グループSNEが手がける、可愛くてちょっと厄介なヒロインになりきって泥沼の会話劇を繰り広げる新感覚のTRPGが好評発売中です。TRPG初心者にもおすすめです。',
    tags: ['グループSNE', '初心者向け', '会話型RPG']
  }
];

// 記事本文のスクレイピング関数（全文がないRSSへの対策）
async function scrapeFullContent(url) {
  try {
    if (!url || url === '#') return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5秒でタイムアウト
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // サイトごとの代表的な本文セレクタ
    const selectors = ['.entry-content', '.article-body', 'article .content', 'main article', '#m-detail', '.p-article__content'];
    
    for (let selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        el.find('script, style, iframe, .ads, .social-share, .related-posts, nav').remove();
        return el.html();
      }
    }
    
    // フォールバック: pタグの収集
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(`<p>${$(el).html()}</p>`);
    });
    if (paragraphs.length > 2) return paragraphs.join('\n');
    
    return null;
  } catch (error) {
    return null;
  }
}

// 記事の内容を5〜8行程度にまとめる関数
function generateShortSummary(html) {
  if (!html) return 'ニュースの詳細内容はリンク先でご確認ください。';
  const $ = cheerio.load(html);
  $('script, style, iframe, nav, header, footer').remove();
  let plainText = $.text().replace(/\s+/g, ' ').trim();
  
  const sentences = plainText.split(/(?<=[。！？])/).map(s => s.trim()).filter(s => s.length > 5);
  if (sentences.length === 0) return plainText.substring(0, 300) + '...';

  // 最初の5〜7文を抽出（およそ5〜8行分になるように調整）
  const extractCount = Math.min(sentences.length, 6);
  let summary = sentences.slice(0, extractCount).join(' ');
  
  if (sentences.length > extractCount) {
    summary += ' ...（続きは情報元のサイトでご覧ください）';
  }
  
  return summary;
}

// ジャンル判定ヘルパー
function determineGenre(title, content, defaultGenre) {
  const text = (title + ' ' + (content || '')).toLowerCase();
  
  if (text.includes('ボードゲーム') || text.includes('ボドゲ') || text.includes('アナログゲーム') || text.includes('ゲムマ')) {
    return 'boardgame';
  }
  if (text.includes('trpg') || text.includes('クトゥルフ') || text.includes('ココフォリア') || text.includes('テーブルトーク')) {
    return 'trpg';
  }
  if (text.includes('マーダーミステリー') || text.includes('マダミス')) {
    return 'murder_mystery';
  }
  if (text.includes('脱出ゲーム') || text.includes('リアル脱出') || text.includes('謎解き')) {
    return 'escape_game';
  }
  
  // デフォルト（特定のキーワードがなければフィードごとのデフォルトか、allの場合はnullを返して除外対象とする）
  return defaultGenre !== 'all' ? defaultGenre : null;
}

function getGenreLabel(genre) {
  const labels = {
    'boardgame': 'ボードゲーム',
    'trpg': 'TRPG',
    'murder_mystery': 'マダミス',
    'escape_game': '脱出ゲーム・謎解き'
  };
  return labels[genre] || 'ニュース';
}

app.get('/api/news', async (req, res) => {
  try {
    let allNews = [];

    // 各フィードの複数ページから並列で取得
    const fetchPromises = [];
    RSS_FEEDS.forEach(feedInfo => {
      const maxPages = feedInfo.pages || 1;
      for (let p = 1; p <= maxPages; p++) {
        let targetUrlStr = feedInfo.url;
        if (p > 1) {
          try {
            const urlObj = new URL(feedInfo.url);
            urlObj.searchParams.append('paged', p);
            targetUrlStr = urlObj.toString();
          } catch(e) {}
        }
        
        fetchPromises.push((async () => {
          try {
            const feed = await parser.parseURL(targetUrlStr);
            
            const articles = feed.items.map((item, index) => {
              const genreId = determineGenre(item.title, item.contentSnippet, feedInfo.defaultGenre);
              
              // アナログゲーム関連キーワードが見つからなかった記事は除外
              if (!genreId) return null;
              
              // 日付のフォーマット (YYYY.MM.DD)
              const pubDate = new Date(item.pubDate);
              const formattedDate = !isNaN(pubDate) 
                ? `${pubDate.getFullYear()}.${String(pubDate.getMonth() + 1).padStart(2, '0')}.${String(pubDate.getDate()).padStart(2, '0')}`
                : '最近';
              
              // タグの生成（カテゴリがあればそれを使用）
              const tags = item.categories ? item.categories.slice(0, 3) : ['ニュース', '最新情報'];

              return {
                id: `news-${feedInfo.sourceName}-${Date.now()}-${p}-${index}`,
                title: item.title || 'タイトルなし',
                genre: genreId,
                genreLabel: getGenreLabel(genreId),
                date: formattedDate,
                pubDateObj: pubDate, // ソート用
                source: feedInfo.sourceName,
                sourceUrl: item.link || '',
                description: item['content:encoded'] || item.content || item.contentSnippet || 'ニュースの詳細内容はリンク先でご確認ください。',
                tags: tags
              };
            }).filter(item => item !== null);
            
            // 取得した記事をマージ
            allNews = allNews.concat(articles);
          } catch (err) {
            console.error(`Error fetching feed from ${targetUrlStr}:`, err.message);
          }
        })());
      }
    });

    await Promise.all(fetchPromises);

    // 重複記事の排除（より強力に）
    const uniqueNews = [];
    allNews.forEach(news => {
      // URLのクエリを除去したベース部分
      let urlBase = news.sourceUrl || '';
      try {
        if (urlBase.startsWith('http')) {
          const u = new URL(urlBase);
          urlBase = u.origin + u.pathname;
        }
      } catch(e) {}

      // タイトルの最初の15文字（スペース除去）
      const titlePrefix = news.title.replace(/[\s　]/g, '').slice(0, 15);

      // 既存のuniqueNewsの中に同じ記事があるか探す
      const isDuplicate = uniqueNews.some(existing => {
        let existingUrlBase = existing.sourceUrl || '';
        try {
          if (existingUrlBase.startsWith('http')) {
            const eu = new URL(existingUrlBase);
            existingUrlBase = eu.origin + eu.pathname;
          }
        } catch(e) {}
        
        const existingTitlePrefix = existing.title.replace(/[\s　]/g, '').slice(0, 15);

        // URLが（クエリ抜きで）同じ、またはタイトルの最初の15文字が同じなら重複
        return (urlBase && urlBase.length > 10 && urlBase === existingUrlBase) || (titlePrefix && existingTitlePrefix === titlePrefix);
      });

      if (!isDuplicate) {
        uniqueNews.push(news);
      }
    });
    allNews = uniqueNews;

    // TRPG記事の件数を確認し、足りなければSEED（保険データ）を強制追加
    const trpgCount = allNews.filter(n => n.genre === 'trpg').length;
    if (trpgCount < 3) {
      allNews = allNews.concat(SEED_NEWS.map(seed => ({ ...seed, id: seed.id + Date.now() })));
    }

    // 新しい順（日付降順）にソート
    allNews.sort((a, b) => {
      const dateA = a.pubDateObj ? a.pubDateObj.getTime() : 0;
      const dateB = b.pubDateObj ? b.pubDateObj.getTime() : 0;
      return dateB - dateA;
    });
    
    // ソート用オブジェクトを削除
    let cleanNews = allNews.map(item => {
      delete item.pubDateObj;
      return item;
    });

    // 最後に各記事のURLへアクセスし、本文のスクレイピングを試みる（並列処理）
    const scrapePromises = cleanNews.map(async (newsItem) => {
      if (newsItem.sourceUrl && newsItem.sourceUrl !== '#') {
        const fullContent = await scrapeFullContent(newsItem.sourceUrl);
        if (fullContent) {
          newsItem.description = generateShortSummary(fullContent);
        } else {
          newsItem.description = generateShortSummary(newsItem.description);
        }
      }
    });
    await Promise.allSettled(scrapePromises);

    res.json(cleanNews);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// 本番環境（デプロイ後）用の静的ファイル配信設定
// ホスティングサービス（Render等）では NODE_ENV=production になるため、
// バックエンドが直接フロントエンドのビルド結果(dist)を配信します
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
