const fs = require('fs');
const path = require('path');

const USER = 'arash-ahmadii';
const TOKEN = process.env.GITHUB_TOKEN || '';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function getStats() {
  const [user, repos] = await Promise.all([
    fetchJson(`https://api.github.com/users/${USER}`),
    fetchJson(`https://api.github.com/users/${USER}/repos?per_page=100`),
  ]);
  const publicRepos = user.public_repos || repos.length;
  let totalStars = 0;
  const langCount = {};
  repos.forEach((r) => {
    totalStars += r.stargazers_count || 0;
    const lang = r.language || 'Other';
    langCount[lang] = (langCount[lang] || 0) + 1;
  });
  const sorted = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
  const topLang = sorted[0];
  const topLangName = topLang ? topLang[0] : '—';
  const topLangPct = topLang ? Math.round((topLang[1] / publicRepos) * 100) : 0;
  const topLangs = sorted.slice(0, 5).map(([n, c]) => ({ name: n, pct: Math.round((c / publicRepos) * 100) }));
  return {
    repos: publicRepos,
    stars: totalStars,
    topLang: topLangName,
    topLangPct: Math.min(100, topLangPct),
    topLangs,
  };
}

function clamp(val, max) {
  return Math.min(100, Math.round((val / max) * 100));
}

function buildSvg(stats) {
  const C = '#22d3ee';
  const gridLines = [];
  for (let i = 0; i <= 82; i++) {
    gridLines.push(`<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="240" stroke="${C}" stroke-width="0.3" opacity="0.06"/>`);
  }
  for (let i = 0; i <= 24; i++) {
    gridLines.push(`<line x1="0" y1="${i * 10}" x2="820" y2="${i * 10}" stroke="${C}" stroke-width="0.3" opacity="0.06"/>`);
  }

  const card = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ry="12" fill="#161b22" stroke="${C}" stroke-width="1" opacity="0.95"/>`;

  const ease = 'calcMode="spline" keyTimes="0;1" keySplines="0.25 0.1 0.25 1"';
  const bar = (x, y, w, h, pct, begin) => {
    const endW = Math.max(2, (w * pct) / 100);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="#21262d"/>
      <rect x="${x}" y="${y}" width="0" height="${h}" rx="${h/2}" fill="url(#barGrad)">
        <animate attributeName="width" from="0" to="${endW}" dur="0.8s" begin="${begin}s" fill="freeze" ${ease}/>
      </rect>`;
  };

  const repoPct = clamp(stats.repos, 25);
  const starPct = clamp(stats.stars, 50);
  const langPct = stats.topLangPct;

  const langRows = stats.topLangs.slice(0, 4).map((l, i) => {
    const y = 173 + i * 14;
    const bw = 355;
    const bh = 4;
    return `<text x="395" y="${y - 2}" font-family="system-ui,sans-serif" font-size="10" fill="#8b949e">${l.name}</text>
      <g transform="translate(395, ${y})">${bar(0, 0, bw, bh, l.pct, 0.5 + i * 0.08)}</g>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240" viewBox="0 0 820 240">
  <defs>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0891b2"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="820" height="240" fill="#0d1117"/>
  <g>${gridLines.join('')}</g>
  <g>
    ${card(20, 20, 340, 200)}
    <text x="50" y="55" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#ffffff">Total Repositories</text>
    <text x="50" y="95" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.5s" fill="freeze"/>
      ${stats.repos}
    </text>
    <text x="50" y="120" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Public repositories</text>
    <g transform="translate(50, 140)">${bar(0, 0, 280, 6, repoPct, 0.1)}</g>
  </g>
  <g>
    ${card(380, 20, 205, 95)}
    <text x="395" y="38" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">Stars Earned</text>
    <text x="395" y="58" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.2s" fill="freeze"/>
      ${stats.stars}
    </text>
    <g transform="translate(395, 70)">${bar(0, 0, 180, 5, starPct, 0.4)}</g>
  </g>
  <g>
    ${card(605, 20, 195, 95)}
    <text x="620" y="38" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">Top Language</text>
    <text x="620" y="58" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.3s" fill="freeze"/>
      ${stats.topLang}
    </text>
    <text x="620" y="75" font-family="system-ui,sans-serif" font-size="10" fill="#8b949e">${langPct}% of repos</text>
    <g transform="translate(620, 82)">${bar(0, 0, 165, 5, langPct, 0.5)}</g>
  </g>
  <g>
    ${card(380, 125, 420, 95)}
    <text x="395" y="152" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Languages</text>
    <text x="395" y="165" font-family="system-ui,sans-serif" font-size="10" fill="#8b949e">By repository count</text>
    ${langRows}
  </g>
</svg>
`;
}

async function main() {
  const stats = await getStats();
  const outPath = path.join(process.env.GITHUB_WORKSPACE || '.', 'assets', 'analytics.svg');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buildSvg(stats), 'utf8');
  console.log('Wrote', outPath, stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
