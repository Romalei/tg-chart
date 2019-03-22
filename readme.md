# TG Chart
Small chart library for telegram challenge. Prepare yourself to see the worst code you've ever seen :)
## Getting started
1. Import css file
```<link rel="stylesheet" href="tg-chart.css">```
2. Import script file
```<script src="tgchart.js"></script>```
3. 

## Basic usage
![Alt](/manifest/basic-usage.jpg "Usage example")
## API
```
new TgChart(element, data, config)
```
| Argument | Property  | Description |
|---|---|---|
| element || can be HTMLElement (node) or its selector, e.g. '.my-canvas-wrapper' |
| data | columns  | List of all data columns in the chart. Each column has its label at position 0, followed by values. x values are UNIX timestamps in milliseconds.  |
| | types  | Chart types for each of the columns. Supported values: "line" (line on the graph with linear interpolation), "x" (x axis values for each of the charts at the corresponding positions).  |
| |  colors |  Color for each line in 6-hex-digit format (e.g. "#AAAAAA").  |
| | names | Names for each line. |
| config | trackSize | Number from 0 to 100 (%). The size of selected range on timeline. Default value - 30 |
|| minTrackSize | Number from 0 to 100 (%). Minimum size of the selected range on timeline. Default value - 20 |
|| lineWidth | Number. Width of chart lines in px. Default value - 3 |
|| gridColor | String. Color of background lines of the chart. Default value - '#A9ABAD' |
||timeLineHeight|Number. Height of the timeline in px. Default value - 60|
||height|Number. Height of the canvas in px. Default value - 400|
||responsive|Boolean. if true, adds event listener on window resize for recalculate width and redraw the chart|
||theme| Can be 'light' or 'dark'|
## Available methods
| Name | Description |
|---|---|
| switchTheme(theme) | "theme" can be 'light' or 'dark'. If null, so it will change from 'light' to 'dark' and vise versa |
| draw() | redraw the chart |