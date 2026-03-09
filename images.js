// =============================================
// Fuji Soul Tours — Image & Content Config
// =============================================
// このファイルをadmin.htmlで編集できます。
// 手動で編集する場合はURLを差し替えてください。

const SITE_CONFIG = {

  // ===== HERO =====
  hero: {
    // ヒーロー背景画像（横幅1600px以上推奨）
    backgroundImage: "",
    // ヒーローの上に重ねる小さめ写真（任意）
    overlayImages: []
  },

  // ===== GALLERY =====
  // メインギャラリー写真（最大12枚推奨）
  gallery: [
    // { url: "https://...", alt: "Shiraito Falls", caption: "白糸の滝" },
  ],

  // ===== ROUTE CARDS =====
  routes: {
    classic: { image: "" },
    culture: { image: "" },
    photo:   { image: "" }
  },

  // ===== ITINERARY STOPS =====
  stops: {
    shiraito:   { image: "" },
    sengen:     { image: "" },
    yakisoba:   { image: "" },
    sake:       { image: "" },
    tea:        { image: "" },
    beer:       { image: "" },
    tanuki:     { image: "" }
  },

  // ===== HOST =====
  host: {
    portrait: ""
  },

  // ===== INSTAGRAM EMBED =====
  instagram: {
    handle: "fujisoultours",
    // 表示したいリール/ポストのURLを入れる
    reels: [
      // "https://www.instagram.com/reel/xxxxx/"
    ]
  }
};
