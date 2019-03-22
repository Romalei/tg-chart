# TG Chart
Small chart library for telegram challenge
## Basic usage
![Alt](/manifest/basic-usage.jpg "Usage example")
## Config interface
```
{
    trackSize: 30, // %
    minTrackSize: 20, // %
    lineWidth: 3, // px
    gridColor: '#A9ABAD', // color of background lines
    timeLineHeight: 80, // px 
}
```
## Data interface
```
{
    columns: [][];
    types: { [key]: string };
    names: { [key]: string };
    colors: { [key]: string }
}
```
|  Property | Description  |
|---|---|
| columns  | List of all data columns in the chart. Each column has its label at position 0, followed by values. x values are UNIX timestamps in milliseconds.  |
| types  | Chart types for each of the columns. Supported values: "line" (line on the graph with linear interpolation), "x" (x axis values for each of the charts at the corresponding positions).  |
|  colors |  Color for each line in 6-hex-digit format (e.g. "#AAAAAA").  |
| names | Names for each line. |