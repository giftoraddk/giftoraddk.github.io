import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DatasetComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { GraphChartBase } from './tools/base.js';

// Mixed bar/line/area chart. Area is just a `line` series with `areaStyle` set — not a distinct
// echarts series type — so only Bar/Line need registering here. LegendComponent is only needed
// when an `option` explicitly sets `legend: {...}` (ECharts' own legend, separate from this
// component's `dataset.source`-driven HTML one) — registered so that doesn't error out.
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, DatasetComponent, LegendComponent, CanvasRenderer]);

export class SvcGraph extends GraphChartBase {}

if (!customElements.get('svc-graph')) customElements.define('svc-graph', SvcGraph);
