#!/usr/bin/env node
/**
 * Reads Lighthouse JSON (stdin or --input) and writes a PageSpeed-style SVG
 * with Performance + SEO gauges for the GitHub profile README.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const inputPath = flag('--input', null);
const outputPath = resolve(flag('--output', 'pagespeed.svg'));
const label = flag('--label', 'dbaik.github.io');

const raw = inputPath ? readFileSync(inputPath, 'utf8') : readFileSync(0, 'utf8');
const report = JSON.parse(raw);
const categories = report.categories ?? report.lighthouseResult?.categories;
if (!categories) {
  console.error('No Lighthouse categories found in input JSON');
  process.exit(1);
}

function scoreOf(id) {
  const cat = categories[id];
  if (!cat || typeof cat.score !== 'number') return null;
  return Math.round(cat.score * 100);
}

const performance = scoreOf('performance');
const seo = scoreOf('seo');

function color(score) {
  if (score == null) return '#9e9e9e';
  if (score >= 90) return '#0cce6b';
  if (score >= 50) return '#ffa400';
  return '#ff4e42';
}

function gauge(x, score, title) {
  const c = color(score);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const value = score == null ? 0 : score;
  const dash = (value / 100) * circumference;
  const gap = circumference - dash;
  const text = score == null ? '—' : String(score);

  return `
  <g transform="translate(${x} 8)">
    <circle cx="56" cy="56" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="8"/>
    <circle cx="56" cy="56" r="${r}" fill="none" stroke="${c}" stroke-width="8"
      stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      transform="rotate(-90 56 56)"/>
    <text x="56" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
      font-size="22" font-weight="700" fill="${c}">${text}</text>
    <text x="56" y="118" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
      font-size="13" fill="#5f6368">${title}</text>
  </g>`;
}

const width = 260;
const height = 140;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="PageSpeed ${label}: Performance ${performance ?? 'n/a'}, SEO ${seo ?? 'n/a'}">
  <title>PageSpeed Insights — ${label}</title>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${gauge(8, performance, 'Performance')}
  ${gauge(140, seo, 'SEO')}
  <text x="130" y="136" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-size="10" fill="#9aa0a6">${label}</text>
</svg>
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, svg.trim() + '\n');
console.log(`Wrote ${outputPath} (performance=${performance}, seo=${seo})`);
