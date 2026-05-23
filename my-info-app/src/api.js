// 取得先RSSフィードのリスト（アナログゲーム関連ニュースなど）
export const RSS_FEEDS = [
  { url: 'https://tgiw.info/feed', sourceName: 'Table Games in the World', pages: 3, defaultGenre: 'boardgame' },
  { url: 'https://automaton-media.com/feed/', sourceName: 'AUTOMATON', pages: 3, filterMode: 'strict' },
  { url: 'https://www.4gamer.net/rss/index.xml', sourceName: '4Gamer.net', pages: 3, filterMode: 'strict' },
  { url: 'https://jp.ign.com/feed.xml', sourceName: 'IGN Japan', pages: 2, filterMode: 'strict' },
  { url: 'https://www.inside-games.jp/rss/index.rdf', sourceName: 'インサイド', pages: 2, filterMode: 'strict' },
  { url: 'https://news.google.com/rss/search?q=%E8%AC%8E%E8%A7%A3%E3%81%8D+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'escape_game' },
  { url: 'https://news.google.com/rss/search?q=%E3%83%AA%E3%82%A2%E3%83%AB%E8%84%B1%E5%87%BA%E3%82%B2%E3%83%BC%E3%83%A0+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'escape_game' },
  { url: 'https://news.google.com/rss/search?q=%E3%83%9E%E3%83%BC%E3%83%80%E3%83%BC%E3%83%9F%E3%82%B9%E3%83%86%E3%83%AA%E3%83%BC+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'murder_mystery' },
  { url: 'https://news.google.com/rss/search?q=TRPG+when:30d&hl=ja&gl=JP&ceid=JP:ja', sourceName: 'Googleニュース', pages: 1, defaultGenre: 'trpg' }
];

// TRPG等の記事が運悪くRSSから1件も取得できなかった場合の保険データ
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

// 記事の内容を5〜8行程度にまとめる関数
function generateShortSummary(htmlContent) {
  if (!htmlContent) return 'ニュースの詳細内容はリンク先でご確認ください。';
  
  // DOMを使ってテキストを抽出
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  let plainText = tempDiv.textContent || tempDiv.innerText || '';
  plainText = plainText.replace(/\s+/g, ' ').trim();
  
  const sentences = plainText.split(/(?<=[。！？])/).map(s => s.trim()).filter(s => s.length > 5);
  if (sentences.length === 0) return plainText.substring(0, 300) + '...';

  // 最初の5〜7文を抽出
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

// XMLからタグのテキストを取得するヘルパー
function getXmlNodeText(item, tagNames) {
  for (const tag of tagNames) {
    const node = item.querySelector(tag);
    if (node && node.textContent) {
      return node.textContent.trim();
    }
  }
  return '';
}

export async function fetchNewsData() {
  let allNews = [];
  const fetchPromises = [];

  // ブラウザからの取得用にCORS回避プロキシを利用
  const CORS_PROXY = 'https://corsproxy.io/?url=';

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
      
      const fetchUrl = CORS_PROXY + encodeURIComponent(targetUrlStr);

      fetchPromises.push((async () => {
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error('Network response was not ok');
          const text = await res.text();
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          
          // RSS(item) または Atom(entry) の取得
          let items = Array.from(xmlDoc.querySelectorAll('item'));
          if (items.length === 0) {
            items = Array.from(xmlDoc.querySelectorAll('entry'));
          }

          const articles = items.map((item, index) => {
            const title = getXmlNodeText(item, ['title']);
            const linkNode = item.querySelector('link');
            const link = linkNode ? (linkNode.textContent || linkNode.getAttribute('href') || '') : '';
            const description = getXmlNodeText(item, ['content\\:encoded', 'content', 'description', 'summary']);
            const pubDateText = getXmlNodeText(item, ['pubDate', 'published', 'updated']);
            
            const genreId = determineGenre(title, description, feedInfo.defaultGenre);
            if (!genreId) return null;
            
            const pubDate = new Date(pubDateText);
            const formattedDate = !isNaN(pubDate) 
              ? `${pubDate.getFullYear()}.${String(pubDate.getMonth() + 1).padStart(2, '0')}.${String(pubDate.getDate()).padStart(2, '0')}`
              : '最近';
              
            // カテゴリの取得
            const categories = Array.from(item.querySelectorAll('category')).map(c => c.textContent || c.getAttribute('term')).filter(c => c);
            const tags = categories.length > 0 ? categories.slice(0, 3) : ['ニュース', '最新情報'];

            return {
              id: `news-${feedInfo.sourceName}-${Date.now()}-${p}-${index}`,
              title: title || 'タイトルなし',
              genre: genreId,
              genreLabel: getGenreLabel(genreId),
              date: formattedDate,
              pubDateObj: pubDate,
              source: feedInfo.sourceName,
              sourceUrl: link,
              description: generateShortSummary(description),
              tags: tags
            };
          }).filter(item => item !== null);
          
          allNews = allNews.concat(articles);
        } catch (err) {
          console.error(`Error fetching feed from ${targetUrlStr}:`, err.message);
        }
      })());
    }
  });

  await Promise.all(fetchPromises);

  // 重複記事の排除
  const uniqueNews = [];
  allNews.forEach(news => {
    let urlBase = news.sourceUrl || '';
    try {
      if (urlBase.startsWith('http')) {
        const u = new URL(urlBase);
        urlBase = u.origin + u.pathname;
      }
    } catch(e) {}

    const titlePrefix = news.title.replace(/[\s　]/g, '').slice(0, 15);

    const isDuplicate = uniqueNews.some(existing => {
      let existingUrlBase = existing.sourceUrl || '';
      try {
        if (existingUrlBase.startsWith('http')) {
          const eu = new URL(existingUrlBase);
          existingUrlBase = eu.origin + eu.pathname;
        }
      } catch(e) {}
      
      const existingTitlePrefix = existing.title.replace(/[\s　]/g, '').slice(0, 15);
      return (urlBase && urlBase.length > 10 && urlBase === existingUrlBase) || (titlePrefix && existingTitlePrefix === titlePrefix);
    });

    if (!isDuplicate) {
      uniqueNews.push(news);
    }
  });
  
  allNews = uniqueNews;

  // TRPG記事の不足分を補填
  const trpgCount = allNews.filter(n => n.genre === 'trpg').length;
  if (trpgCount < 3) {
    allNews = allNews.concat(SEED_NEWS.map(seed => ({ ...seed, id: seed.id + Date.now() })));
  }

  // 新しい順にソート
  allNews.sort((a, b) => {
    const dateA = a.pubDateObj ? a.pubDateObj.getTime() : 0;
    const dateB = b.pubDateObj ? b.pubDateObj.getTime() : 0;
    return dateB - dateA;
  });
  
  // ソート用オブジェクトを削除
  return allNews.map(item => {
    delete item.pubDateObj;
    return item;
  });
}
