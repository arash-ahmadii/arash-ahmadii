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

  const repoIcon = `<g stroke="${C}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="12" width="28" height="22" rx="2"/>
      <path d="M8 18h28"/>
      <rect x="12" y="6" width="12" height="6" rx="1"/>
    </g>`;
  const starIcon = `<g stroke="${C}" stroke-width="1.5" fill="none" stroke-linejoin="round">
      <path d="M22 4l2.5 7.7h8l-6.5 4.7 2.5 7.7-6.5-4.7-6.5 4.7 2.5-7.7-6.5-4.7h8z"/>
    </g>`;
  const langIcon = `<g stroke="${C}" stroke-width="1.8" fill="none">
      <path d="M8 12 L4 24 L8 36" stroke-linecap="round"/>
      <path d="M36 12 L40 24 L36 36" stroke-linecap="round"/>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240" viewBox="0 0 820 240">
  <rect width="820" height="240" fill="#0d1117"/>
  <g>${gridLines.join('')}</g>
  <g>
    ${card(20, 20, 340, 200)}
    <g transform="translate(50, 40)">${repoIcon}</g>
    <text x="50" y="100" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#ffffff">Total Repositories</text>
    <text x="50" y="140" font-family="system-ui,sans-serif" font-size="32" font-weight="700" fill="#ffffff">${stats.repos}</text>
    <text x="50" y="170" font-family="system-ui,sans-serif" font-size="12" fill="#8b949e">Public repositories in your profile</text>
  </g>
  <g>
    ${card(380, 20, 205, 95)}
    <g transform="translate(395, 38)">${starIcon}</g>
    <text x="395" y="70" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Stars Earned</text>
    <text x="395" y="95" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#ffffff">${stats.stars}</text>
  </g>
  <g>
    ${card(605, 20, 195, 95)}
    <g transform="translate(620, 38)">${langIcon}</g>
    <text x="620" y="70" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Top Language</text>
    <text x="620" y="95" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#ffffff">${stats.topLang}</text>
  </g>
  <g>
    ${card(380, 125, 420, 95)}
    <text x="395" y="155" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">Contribution Activity</text>
    <text x="395" y="185" font-family="system-ui,sans-serif" font-size="12" fill="#8b949e">Last 365 days · see snake below</text>
    <path d="M395 195h120" stroke="${C}" stroke-width="1" opacity="0.6"/>
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
