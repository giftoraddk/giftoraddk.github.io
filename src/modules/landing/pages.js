// Danh sách meta `page` của mọi trang src/pages/landing/*.astro (+ /system, /system/docs) — 1 nguồn cho sitemap.xml.ts
// và llms.txt.ts.
// Trang mới: export `page` trong module của nó rồi thêm vào đây. Chỉ trang `indexable: true` được đưa ra
// cho bot (các trang còn lại render <meta robots noindex> — xem src/pages/landing/*.astro).
import { page as main } from './main.js';
import { page as home } from './home.js';
import { page as channel } from './channel.js';
import { page as aurora } from './aurora.js';
import { page as ember } from './ember.js';
import { page as midnight } from './midnight.js';
import { page as sakura } from './sakura.js';
import { page as spatial } from './spatial.js';
import { page as stable } from './stable.js';
import { page as terra } from './terra.js';
import { page as system, docsPage as systemDocs } from '../system/meta.js';

export const landingPages = [main, home, channel, aurora, ember, midnight, sakura, spatial, stable, terra, system, systemDocs];

export const indexableLandingPages = landingPages.filter((p) => p.indexable);
