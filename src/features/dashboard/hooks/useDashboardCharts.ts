import { useState, useLayoutEffect } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import { format } from 'date-fns';
import { ChartData, ChartMetric } from '../types/dashboard.types';

export function useDashboardCharts(weeklyChartData: ChartData[]) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>('calories_burned');

  useLayoutEffect(() => {
    if (!weeklyChartData.length) return;

    let root = am5.Root.new("chartdiv");

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root)
    ]);

    let chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: true,
      panY: false,
      wheelX: "panX",
      wheelY: "zoomX",
      pinchZoomX: true,
      layout: root.verticalLayout
    }));

    // Add cursor (tooltips only, no behavior change)
    let cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
      behavior: "none"
    }));
    cursor.lineX.set("visible", false);
    cursor.lineY.set("visible", false);

    // Create axes
    let xAxisRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30,
      minorGridEnabled: true
    });
    xAxisRenderer.grid.template.set("strokeOpacity", 0);

    let xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
      categoryField: "date",
      renderer: xAxisRenderer,
      tooltip: am5.Tooltip.new(root, {})
    }));
    
    const formattedData = weeklyChartData.map(d => ({
      ...d,
      date: format(new Date(d.date), 'EEE')
    }));
    xAxis.data.setAll(formattedData);

    let yAxisRenderer = am5xy.AxisRendererY.new(root, {});
    yAxisRenderer.grid.template.set("strokeOpacity", 0.05);
    yAxisRenderer.grid.template.set("strokeDasharray", [3, 3]);

    let yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
      renderer: yAxisRenderer,
      min: 0
    }));

    // Series color and type selection
    const configObj: Record<string, { color: number; type: string; unit: string }> = {
      calories_burned:      { color: 0x10b981, type: 'area', unit: 'kcal' }, 
      workouts_completed:   { color: 0x7c3aed, type: 'line', unit: 'workouts' },
      hydration_completion: { color: 0x3b82f6, type: 'area', unit: '%' },
      exercises_completed:  { color: 0xf59e0b, type: 'line', unit: 'exercises' },
      workout_duration:     { color: 0xef4444, type: 'line', unit: 'min' }
    };
    const config = configObj[chartMetric] || { color: 0x7c3aed, type: 'line', unit: '' };

    let series: am5xy.LineSeries;
    if (config.type === 'area') {
      series = chart.series.push(am5xy.LineSeries.new(root, {
        name: chartMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: chartMetric,
        categoryXField: "date",
        fill: am5.color(config.color),
        stroke: am5.color(config.color),
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY} " + config.unit
        })
      }));
      series.fills.template.setAll({
        fillOpacity: 0.2,
        visible: true
      });
    } else {
      series = chart.series.push(am5xy.LineSeries.new(root, {
        name: chartMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: chartMetric,
        categoryXField: "date",
        stroke: am5.color(config.color),
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY} " + config.unit
        })
      }));
    }

    series.strokes.template.setAll({
      strokeWidth: 4
    });

    series.bullets.push(function () {
      let graphics = am5.Circle.new(root, {
        radius: 6,
        fill: am5.color(0x18181b),
        stroke: am5.color(config.color),
        strokeWidth: 2
      });

      return am5.Bullet.new(root, {
        sprite: graphics
      });
    });

    series.data.setAll(formattedData);
    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [weeklyChartData, chartMetric]);

  return { chartMetric, setChartMetric };
}
