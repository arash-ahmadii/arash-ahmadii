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

  // Chart helpers: ring (cx,cy,r,pct) and bar (x,y,w,h,pct)
  const ease = 'calcMode="spline" keyTimes="0;1" keySplines="0.25 0.1 0.25 1"';
  const ringChart = (cx, cy, r, pct, begin) => {
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#21262d" stroke-width="8"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
        transform="rotate(-90 ${cx} ${cy})">
        <animate attributeName="stroke-dashoffset" from="${circ}" to="${offset}" dur="1.2s" begin="${begin}s" fill="freeze" ${ease}/>
      </circle>`;
  };
  const barChart = (x, y, w, h, pct, begin) => {
    const endW = Math.max(4, (w * pct) / 100);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#21262d"/>
      <rect x="${x}" y="${y}" width="0" height="${h}" rx="2" fill="url(#barGrad)">
        <animate attributeName="width" from="0" to="${endW}" dur="1s" begin="${begin}s" fill="freeze" ${ease}/>
      </rect>`;
  };
  const donutSlice = (cx, cy, r, pct, begin) => {
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#21262d" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
        transform="rotate(-90 ${cx} ${cy})">
        <animate attributeName="stroke-dashoffset" from="${circ}" to="${offset}" dur="1s" begin="${begin}s" fill="freeze" ${ease}/>
      </circle>`;
  };

  const repoPct = clamp(stats.repos, 20);
  const starPct = clamp(stats.stars, 50);
  const langPct = stats.topLangPct;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240" viewBox="0 0 820 240">
  <defs>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0891b2"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <clipPath id="clipRing"><rect x="200" y="30" width="160" height="160"/></clipPath>
  </defs>
  <rect width="820" height="240" fill="#0d1117"/>
  <g>${gridLines.join('')}</g>
  <g>
    ${card(20, 20, 340, 200)}
    <text x="50" y="55" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#ffffff">Total Repositories</text>
    <text x="50" y="95" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.6s" fill="freeze"/>
      ${stats.repos}
    </text>
    <text x="50" y="120" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Public repositories</text>
    <g clip-path="url(#clipRing)">${ringChart(270, 110, 48, repoPct, 0.1)}</g>
  </g>
  <g>
    ${card(380, 20, 205, 95)}
    <text x="395" y="38" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">Stars Earned</text>
    <text x="395" y="58" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.3s" fill="freeze"/>
      ${stats.stars}
    </text>
    <g transform="translate(395, 68)">${barChart(0, 0, 180, 12, starPct, 0.5)}</g>
  </g>
  <g>
    ${card(605, 20, 195, 95)}
    <text x="620" y="38" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">Top Language</text>
    <text x="620" y="60" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#ffffff">
      <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.4s" fill="freeze"/>
      ${stats.topLang}
    </text>
    <g transform="translate(680, 52)">${donutSlice(32, 28, 26, langPct, 0.5)}</g>
  </g>
  <g>
    ${card(380, 125, 420, 95)}
    <text x="395" y="155" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Contribution Activity</text>
    <text x="395" y="178" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Last 365 days · see snake below</text>
    <g transform="translate(395, 188)">
      <rect x="0" y="0" width="360" height="6" rx="3" fill="#21262d"/>
      <rect x="0" y="0" width="0" height="6" rx="3" fill="url(#barGrad)">
        <animate attributeName="width" values="0;120;360;120;360" dur="3s" repeatCount="indefinite"
          calcMode="spline" keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1"/>
      </rect>
    </g>
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
