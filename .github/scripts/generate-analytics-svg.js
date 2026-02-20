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
  const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
  const topLangName = topLang ? topLang[0] : '—';
  const topLangPct = topLang ? Math.round((topLang[1] / publicRepos) * 100) : 0;
  return {
    repos: publicRepos,
    stars: totalStars,
    topLang: topLangName,
    topLangPct: Math.min(100, topLangPct),
  };
}

function clampPct(val, max) {
  return Math.min(100, Math.round((val / max) * 100));
}

function buildSvg(stats) {
  const r = 58;
  const half = Math.PI * r;
  const repoPct = clampPct(stats.repos, 15);
  const starPct = clampPct(stats.stars, 30);
  const langPct = stats.topLangPct;
  const offset = (pct) => half * (1 - pct / 100);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="220" viewBox="0 0 820 220">
  <defs>
    <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#58a6ff"/>
      <stop offset="100%" style="stop-color:#79c0ff"/>
    </linearGradient>
    <filter id="agGlow">
      <feGaussianBlur stdDeviation="0.4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g transform="translate(0,20)">
    <g transform="translate(137,0)">
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="#21262d" stroke-width="10" stroke-linecap="round"/>
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="url(#ag)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${half}" stroke-dashoffset="${half}" filter="url(#agGlow)">
        <animate attributeName="stroke-dashoffset" from="${half}" to="${offset(repoPct)}" dur="1.4s" fill="freeze"/>
        <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite" begin="2s"/>
      </path>
      <text x="${r}" y="${r-8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="600" fill="#e6edf3">${stats.repos}</text>
      <text x="${r}" y="${r+28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Repos</text>
    </g>
    <g transform="translate(410,0)">
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="#21262d" stroke-width="10" stroke-linecap="round"/>
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="url(#ag)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${half}" stroke-dashoffset="${half}" filter="url(#agGlow)">
        <animate attributeName="stroke-dashoffset" from="${half}" to="${offset(starPct)}" dur="1.4s" begin="0.2s" fill="freeze"/>
        <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite" begin="2.2s"/>
      </path>
      <text x="${r}" y="${r-8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="600" fill="#e6edf3">${stats.stars}</text>
      <text x="${r}" y="${r+28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Stars</text>
    </g>
    <g transform="translate(683,0)">
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="#21262d" stroke-width="10" stroke-linecap="round"/>
      <path d="M 0 ${r} A ${r} ${r} 0 0 1 ${2*r} ${r}" fill="none" stroke="url(#ag)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${half}" stroke-dashoffset="${half}" filter="url(#agGlow)">
        <animate attributeName="stroke-dashoffset" from="${half}" to="${offset(langPct)}" dur="1.4s" begin="0.4s" fill="freeze"/>
        <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite" begin="2.4s"/>
      </path>
      <text x="${r}" y="${r-8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#e6edf3">${stats.topLang}</text>
      <text x="${r}" y="${r+28}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#8b949e">Top lang</text>
    </g>
  </g>
  <rect x="0" y="195" width="820" height="1" fill="#21262d" opacity="0.6">
    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite"/>
  </rect>
  <rect x="0" y="195" width="180" height="1" fill="#58a6ff" opacity="0.7">
    <animate attributeName="x" from="0" to="640" dur="4s" repeatCount="indefinite"/>
  </rect>
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
