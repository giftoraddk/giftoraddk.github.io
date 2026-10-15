// src/packages/node/preset/everyday.js
//
// Everyday — public, keyless MCP servers (checked 2026-09) through the llm Worker's relay, in one group: <svc-ask>
// calls their tools and answers in the panel; one whose site allows framing opens it, and the answer points it at the
// page it is about. Brand names stay as they are; everything else is { vi, en } (tool/lingo.js).
import { askHere, inGroup, relay, site } from './shared.js';

/** The services, in the tile's order. A node with `mcp` — its server's URL, or { url, headers, tools, args }
 *  (service/models.js SvcNodeMcp) — gets its tools called by <svc-ask>. */
export const everydayNodes = () => [
    {
        id: 'hotels', initials: 'TV', title: 'trivago', tooltip: { vi: 'So giá khách sạn', en: 'Compare hotel prices' },
        description: {
            vi: 'So sánh giá khách sạn, homestay từ các trang đặt phòng lớn theo điểm đến, ngày và số khách; xu hướng giá theo tháng',
            en: 'Compare hotel and homestay prices across the big booking sites by destination, dates and guests; monthly price trends',
        },
        overlay: site('https://www.trivago.com/', 'trivago'),
        mcp: { url: relay('trivago'), tools: ['trivago-accommodation-search', 'trivago-destination-price-trends'] },
    },
    {
        id: 'cars', initials: 'OT', title: 'OctoTrip', tooltip: { vi: 'Thuê xe', en: 'Car rental' },
        description: {
            vi: 'Thuê xe tự lái: giá thực tế theo nơi nhận xe (thành phố, sân bay) và ngày nhận / trả',
            en: 'Self-drive car rental: live prices by pick-up place (city, airport) and pick-up / drop-off dates',
        },
        overlay: site('https://www.octotrip.app/', 'OctoTrip'),
        mcp: { url: relay('cars') },
    },
    {
        id: 'weather', initials: 'WX', title: { vi: 'Thời tiết', en: 'Weather' }, tooltip: { vi: 'Thời tiết', en: 'Weather' },
        description: {
            vi: 'Thời tiết hiện tại và dự báo 7 ngày cho mọi thành phố (Open-Meteo)',
            en: 'Current weather and a 7-day forecast for any city (Open-Meteo)',
        },
        overlay: askHere({ vi: 'Thời tiết', en: 'Weather' }, { vi: 'Đà Nẵng 3 ngày tới có mưa không', en: 'Will it rain in Da Nang in the next 3 days' }),
        mcp: { url: relay('weather') },
    },
    {
        id: 'recipes', initials: 'MD', title: 'TheMealDB', tooltip: { vi: 'Món ăn', en: 'Recipes' },
        description: {
            vi: 'Công thức nấu ăn: tìm món theo tên hoặc nguyên liệu, kèm nguyên liệu và các bước nấu',
            en: 'Recipes: find a dish by name or ingredient, with its ingredients and steps',
        },
        overlay: site('https://www.themealdb.com/', 'TheMealDB'),
        mcp: { url: relay('meals'), tools: ['search_meals', 'get_meal', 'meals_by_ingredient', 'random_meal'] },
    },
    {
        id: 'tv', initials: 'TM', title: 'TVmaze', tooltip: { vi: 'Phim & TV', en: 'Movies & TV' },
        description: {
            vi: 'Tra cứu phim và chương trình TV: nội dung, diễn viên, lịch phát sóng theo quốc gia và ngày',
            en: 'Look up movies and TV shows: plot, cast, broadcast schedule by country and date',
        },
        overlay: site('https://www.tvmaze.com/', 'TVmaze'),
        mcp: { url: relay('tv'), tools: ['search_movies', 'search_tv_shows', 'get_tv_show', 'get_tv_schedule'] },
    },
];

/** @returns {import('./index.js').NodePreset} */
export function everydayPreset({ x = 1000, y = 480, services = everydayNodes } = {}) {
    return {
        id: 'everyday',
        title: { vi: 'Hằng ngày', en: 'Everyday' },
        icon: 'ri:sun-line',
        nodes: (ctx) => inGroup('life', { x, y, title: { vi: 'Hằng ngày', en: 'Everyday' }, tints: ['success', 'warning'] }, services(ctx)),
    };
}
