import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { PolarComponent, TooltipComponent, DatasetComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { GraphChartBase } from './tools/base.js';

// Pie / doughnut / polar bar. Doughnut is just a `pie` series with `radius: ['40%', '70%']` — not a
// distinct type. Polar bar needs BarChart + PolarComponent (angle/radius axes are registered inside
// PolarComponent's own install, echarts doesn't expose them as separate modules). LegendComponent is
// only needed when an `option` explicitly sets `legend: {...}` (ECharts' own legend, separate from
// this component's `dataset.source`-driven HTML one) — registered so that doesn't error out.
echarts.use([PieChart, BarChart, PolarComponent, TooltipComponent, DatasetComponent, LegendComponent, CanvasRenderer]);

export class SvcPie extends GraphChartBase {}

if (!customElements.get('svc-pie')) customElements.define('svc-pie', SvcPie);
