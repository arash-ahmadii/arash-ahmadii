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
  const langPct = stats.topLangPct;
  const pts = (vals, w, h) => {
    const n = vals.length;
    const max = Math.max(...vals, 1);
    let d = `M 0 ${h}`;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1 || 1)) * w;
      const y = h - (vals[i] / max) * h;
      if (i === 0) d += ` L 0 ${y}`;
      else {
        const x0 = ((i - 1) / (n - 1 || 1)) * w;
        const y0 = h - (vals[i - 1] / max) * h;
        const cp1x = x0 + (x - x0) * 0.5;
        d += ` C ${cp1x} ${y0} ${cp1x} ${y} ${x} ${y}`;
      }
    }
    d += ` L ${w} ${h} Z`;
    return d;
  };
  const areaChart = (vals, w, h, begin) => {
    const pathD = pts(vals, w, h);
    const lineD = pathD.replace(/^M [\d.]+ [\d.]+ L 0 ([\d.]+)/, 'M 0 $1').replace(/ L [\d.]+ [\d.]+ Z$/, '');
    return `<path d="${pathD}" fill="url(#areaGrad)" opacity="0">
      <animate attributeName="opacity" values="0;0.5" dur="1s" begin="${begin}s" fill="freeze" ${ease}/>
    </path>
    <path d="${lineD}" fill="none" stroke="${C}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0">
      <animate attributeName="opacity" values="0;1" dur="0.8s" begin="${begin}s" fill="freeze" ${ease}/>
    </path>`;
  };

  const repoVals = [0, Math.min(stats.repos, 3), Math.min(stats.repos, 6), Math.min(stats.repos, 10), stats.repos];
  const starVals = [0, Math.min(stats.stars, 5), Math.min(stats.stars, 15), Math.min(stats.stars, 30), stats.stars];
  const langVals = [0, Math.min(langPct, 25), Math.min(langPct, 50), Math.min(langPct, 75), langPct];
  const langChartPath = () => {
    const vals = stats.topLangs.slice(0, 5).map((l) => l.pct);
    if (!vals.length) return '';
    const w = 400;
    const h = 42;
    const max = 100;
    let d = `M 0 ${h}`;
    for (let i = 0; i < vals.length; i++) {
      const x = (i / (vals.length - 1 || 1)) * w;
      const y = h - (vals[i] / max) * h;
      if (i === 0) d += ` L 0 ${y}`;
      else {
        const x0 = ((i - 1) / (vals.length - 1 || 1)) * w;
        const y0 = h - (vals[i - 1] / max) * h;
        const cp1x = x0 + (x - x0) * 0.5;
        d += ` C ${cp1x} ${y0} ${cp1x} ${y} ${x} ${y}`;
      }
    }
    d += ` L ${w} ${h} Z`;
    const lineD = d.replace(/^M [\d.]+ [\d.]+ L 0 ([\d.]+)/, 'M 0 $1').replace(/ L [\d.]+ [\d.]+ Z$/, '');
    return `<path d="${d}" fill="url(#areaGrad)" opacity="0.35"/>
    <path d="${lineD}" fill="none" stroke="${C}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240" viewBox="0 0 820 240">
  <defs>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0891b2"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="areaGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <rect width="820" height="240" fill="#0d1117"/>
  <g>${gridLines.join('')}</g>
  <g>
    ${card(20, 20, 340, 200)}
    <text x="48" y="48" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Total Repositories</text>
    <text x="48" y="88" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#ffffff">${stats.repos}</text>
    <text x="48" y="108" font-family="system-ui,sans-serif" font-size="10" fill="#8b949e">Public repositories</text>
    <g transform="translate(48, 120)">${areaChart(repoVals, 284, 90, 0.1)}</g>
  </g>
  <g>
    ${card(380, 20, 205, 95)}
    <text x="393" y="36" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#ffffff">Stars Earned</text>
    <text x="393" y="54" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#ffffff">${stats.stars}</text>
    <g transform="translate(393, 62)">${areaChart(starVals, 180, 28, 0.25)}</g>
  </g>
  <g>
    ${card(605, 20, 195, 95)}
    <text x="618" y="36" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#ffffff">Top Language</text>
    <text x="618" y="52" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#ffffff">${stats.topLang}</text>
    <text x="618" y="66" font-family="system-ui,sans-serif" font-size="9" fill="#8b949e">${langPct}%</text>
    <g transform="translate(618, 72)">${areaChart(langVals, 165, 20, 0.35)}</g>
  </g>
  <g>
    ${card(380, 125, 420, 95)}
    <text x="393" y="142" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">Languages</text>
    <text x="393" y="154" font-family="system-ui,sans-serif" font-size="9" fill="#8b949e">By repo count</text>
    <g transform="translate(393, 162)">${langChartPath()}</g>
    <text x="393" y="210" font-family="system-ui,sans-serif" font-size="9" fill="#8b949e">${stats.topLangs.slice(0, 4).map((l) => l.name).join(' · ')}</text>
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
