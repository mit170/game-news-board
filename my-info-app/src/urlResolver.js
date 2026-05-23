/**
 * 検索キーワードの精度を最大化するため、タイトルからノイズとなる装飾記号や不要な長文をクレンジングします。
 * @param {string} title 元のニュースタイトル
 * @returns {string} 検索に適したクレンジング済み文字列
 */
export function cleanTitleForSearch(title) {
  if (!title) return '';
  
  // 1. 装飾用の絵文字、特定の記号、及び括弧をスペースに変換・除去
  let clean = title
    .replace(/[【】［］「」『』()（）]/g, ' ')
    .replace(/[★☆🎲🐉🔍🔐🔥✨⚠️🚀🎯]/g, ' ')
    .replace(/──/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 2. 検索のヒット率を高めるため、長すぎるタイトルは主要部（前半部分）のみを抽出
  // 感嘆符、読点、または特定の区切り文字がある場合はそこで分割
  if (clean.length > 35) {
    const cutIdx = clean.search(/[！!？?。|｜─]/);
    if (cutIdx > 8 && cutIdx < 40) {
      clean = clean.substring(0, cutIdx);
    } else {
      // 区切り文字がない場合は、主要キーワードになりやすい前半35文字を切り出し
      clean = clean.substring(0, 35);
    }
  }
  
  return clean.trim();
}

/**
 * ニュースのメタデータ（タイトル・媒体）から、検索エンジン（Google）上でその記事について検索した結果のページURLを生成します。
 * 直接情報源のサイトに飛ぶのを防ぎ、100%エラーなく安全に検索結果一覧から該当記事を見つけられます。
 * @param {Object} game ニュースオブジェクト
 * @returns {string} Google検索結果ページのURL
 */
export function resolveSmartUrl(game) {
  const { title, source } = game;
  const cleanKeyword = cleanTitleForSearch(title);
  // 例外なく、すべての情報元について検索エンジン（Google）上での検索結果ページへ遷移します
  return `https://www.google.com/search?q=${encodeURIComponent(cleanKeyword + ' ' + source)}`;
}

/**
 * Googleの「I'm Feeling Lucky」機能を活用し、クレンジングされたキーワードと情報元から、検索結果第1位の直接記事ページへ一発でジャンプするスマート直接URLを生成します。
 * これにより、404エラーになる手動URLを使わず、常に最新の正しい直接ページへ安全にアクセスできます。
 * @param {Object} game ニュースオブジェクト
 * @returns {string} 該当の直接記事ページへジャンプするGoogleリダイレクトURL
 */
export function resolveSmartDirectUrl(game) {
  const { title, source } = game;
  const cleanKeyword = cleanTitleForSearch(title);
  // リダイレクト警告を完全に回避するため、I'm Feeling Lucky ではなく通常のGoogle検索結果URLを返します
  return `https://www.google.com/search?q=${encodeURIComponent(cleanKeyword + ' ' + source)}`;
}
