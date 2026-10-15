import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, figureHtml, stripLeadingFigure } from './sanitize.ts';

test('allowed structure survives', () => {
  const html = '<h2>Tiêu đề</h2><p>Một <strong>đoạn</strong> &amp; list</p><ul><li>a</li></ul>';
  assert.equal(sanitizeHtml(html), html);
});

test('script/style/iframe are dropped with their content', () => {
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><p>b</p>'), '<p>a</p><p>b</p>');
});

test('event handlers and non-http urls are stripped; links get rel', () => {
  assert.equal(sanitizeHtml('<p onclick="x()">t</p>'), '<p>t</p>');
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="https://e.com/?a=1&amp;b=2">x</a>'), '<a href="https://e.com/?a=1&amp;b=2" rel="noopener nofollow">x</a>');
  assert.equal(sanitizeHtml('<img src="http://e.com/a.png" onerror="x">'), '<img>');
});

test('unknown tags are unwrapped, stray angle brackets escaped, split-tag tricks defused', () => {
  assert.equal(sanitizeHtml('<div><p>x</p></div>'), '<p>x</p>');
  assert.equal(sanitizeHtml('1 < 2 > 0'), '1 &lt; 2 &gt; 0');
  assert.ok(!sanitizeHtml('<scr<script>ipt>alert(1)</script>').includes('<script'));
});

test('the pipeline figure round-trips', () => {
  const fig = figureHtml('https://i.ibb.co/a.png', 'Hộp "quà"');
  assert.equal(fig, '<figure data-media-wrap="image" data-align="center"><img src="https://i.ibb.co/a.png" alt="Hộp &quot;quà&quot;"></figure>');
  assert.equal(sanitizeHtml(fig), fig);
  assert.equal(stripLeadingFigure(`${fig}<p>x</p>`), '<p>x</p>');
});
