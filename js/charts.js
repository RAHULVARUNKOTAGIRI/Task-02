/**
 * charts.js
 * Lightweight, dependency-free chart rendering using inline SVG.
 * Exposes a pie chart and a bar chart. Both are responsive (viewBox based)
 * and return a DOM element ready to append.
 */

import { createElement } from './utils.js';

/* Shared categorical colour palette for chart series. */
export const CHART_COLORS = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#16a34a', // green
  '#d97706', // amber
  '#dc2626', // red
  '#64748b', // slate
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element with attributes (namespaced helper).
 * @param {string} tag
 * @param {object} [attrs]
 * @returns {SVGElement}
 */
function createSvg(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * Small "no data" placeholder used when a chart has nothing to show.
 * @param {string} message
 * @returns {HTMLElement}
 */
function emptyChart(message) {
  return createElement('p', { className: 'chart-empty', text: message });
}

/**
 * Convert a polar coordinate to cartesian for pie slice maths.
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} angle - radians
 * @returns {{ x: number, y: number }}
 */
function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

/**
 * Render a pie chart with a legend.
 * @param {Array<{label: string, value: number}>} data
 * @param {object} [options]
 * @param {number} [options.size] - svg viewBox size
 * @returns {HTMLElement}
 */
export function renderPieChart(data, { size = 200 } = {}) {
  const points = data.filter((item) => item.value > 0);
  const total = points.reduce((sum, item) => sum + item.value, 0);

  if (!total) return emptyChart('No responses recorded yet.');

  const radius = size / 2;
  const svg = createSvg('svg', {
    viewBox: `0 0 ${size} ${size}`,
    class: 'chart-svg chart-svg--pie',
    role: 'img',
  });

  // A single 100% slice cannot be drawn as an arc, so draw a full circle.
  if (points.length === 1) {
    svg.appendChild(
      createSvg('circle', {
        cx: radius,
        cy: radius,
        r: radius,
        fill: CHART_COLORS[0],
      })
    );
  } else {
    let startAngle = -Math.PI / 2; // begin at the top
    points.forEach((item, index) => {
      const sliceAngle = (item.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const start = polarToCartesian(radius, radius, radius, startAngle);
      const end = polarToCartesian(radius, radius, radius, endAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const path = createSvg('path', {
        d: `M ${radius} ${radius} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      });
      svg.appendChild(path);
      startAngle = endAngle;
    });
  }

  const legend = renderLegend(points, total);

  return createElement('div', {
    className: 'chart chart--pie',
    children: [svg, legend],
  });
}

/**
 * Build a legend list for a set of data points.
 * @param {Array<{label: string, value: number}>} points
 * @param {number} total
 * @returns {HTMLElement}
 */
function renderLegend(points, total) {
  const items = points.map((item, index) => {
    const percentage = Math.round((item.value / total) * 100);
    return createElement('li', {
      className: 'chart-legend__item',
      children: [
        createElement('span', {
          className: 'chart-legend__swatch',
          attrs: {
            style: `background:${CHART_COLORS[index % CHART_COLORS.length]}`,
          },
        }),
        createElement('span', {
          className: 'chart-legend__label',
          text: item.label,
        }),
        createElement('span', {
          className: 'chart-legend__value',
          text: `${item.value} · ${percentage}%`,
        }),
      ],
    });
  });

  return createElement('ul', { className: 'chart-legend', children: items });
}

/**
 * Render a vertical bar chart.
 * @param {Array<{label: string, value: number}>} data
 * @param {object} [options]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {HTMLElement}
 */
export function renderBarChart(data, { width = 420, height = 240 } = {}) {
  const points = data.filter((item) => item.value >= 0);
  const total = points.reduce((sum, item) => sum + item.value, 0);

  if (!points.length || !total) return emptyChart('No votes recorded yet.');

  const padding = { top: 20, right: 16, bottom: 48, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((item) => item.value));

  const svg = createSvg('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'chart-svg chart-svg--bar',
    role: 'img',
  });

  // Horizontal baseline.
  svg.appendChild(
    createSvg('line', {
      x1: padding.left,
      y1: padding.top + chartHeight,
      x2: padding.left + chartWidth,
      y2: padding.top + chartHeight,
      class: 'chart-axis',
    })
  );

  const slot = chartWidth / points.length;
  const barWidth = Math.min(56, slot * 0.6);

  points.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * chartHeight;
    const centerX = padding.left + slot * index + slot / 2;
    const barX = centerX - barWidth / 2;
    const barY = padding.top + chartHeight - barHeight;

    // Bar.
    svg.appendChild(
      createSvg('rect', {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        rx: 6,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })
    );

    // Value label above the bar.
    const valueLabel = createSvg('text', {
      x: centerX,
      y: barY - 6,
      'text-anchor': 'middle',
      class: 'chart-bar__value',
    });
    valueLabel.textContent = item.value;
    svg.appendChild(valueLabel);

    // Category label below the axis (truncated for space).
    const categoryLabel = createSvg('text', {
      x: centerX,
      y: padding.top + chartHeight + 18,
      'text-anchor': 'middle',
      class: 'chart-bar__label',
    });
    categoryLabel.textContent = truncate(item.label, 12);
    svg.appendChild(categoryLabel);
  });

  return createElement('div', {
    className: 'chart chart--bar',
    children: [svg],
  });
}

/**
 * Truncate a label to a maximum length with an ellipsis.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
