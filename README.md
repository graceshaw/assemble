# assemble

Perform probabilistic forecasting (Monte Carlo simulation) for your Jira project. Made with Claude.ai.

## Explanation of sample output (from Claude.ai)

![alt text](https://github.com/graceshaw/assemble/blob/main/src/jira_forecast.png)

# Understanding Your Jira Monte Carlo Forecast Visualizations

The script generates four key visualizations to help you understand your project's forecasted completion. Let me explain each one:

## 1. Forecast Completion Date Distribution

This histogram shows when your remaining work is likely to be completed based on the Monte Carlo simulations.

- **X-axis**: Calendar dates
- **Y-axis**: Frequency (number of simulations resulting in that completion date)
- **Blue bars**: Show the distribution of possible completion dates
- **Vertical red lines**: Mark important percentiles (50%, 75%, 85%, 95%)

**How to interpret it**: The dates where the histogram has peaks represent the most likely completion timeframes. The 50% line means "there's a 50% chance the work will be done by this date," while the 95% line indicates a high-confidence estimate (though with a later date).

## 2. Historical Cycle Time Distribution

This histogram shows how long your completed tickets have typically taken.

- **X-axis**: Number of days to complete a ticket
- **Y-axis**: Frequency (how many tickets took that long)
- **Blue curve**: The overall distribution pattern

**How to interpret it**: This shows your team's velocity patterns. A narrow, left-skewed distribution indicates consistent delivery times, while a wide or multi-peaked distribution suggests variability in how long tickets take.

## 3. Historical Throughput

This bar chart shows how many tickets your team has completed in each time period.

- **X-axis**: Time periods (days, weeks, or months, depending on your settings)
- **Y-axis**: Number of tickets completed

**How to interpret it**: This visualizes your team's delivery rate over time. Look for patterns - consistent bars suggest stable velocity, while high variability might indicate process issues or changing team capacity.

## 4. Cumulative Probability of Completion

This line chart shows the likelihood of completing all work by a given date.

- **X-axis**: Calendar dates
- **Y-axis**: Probability (0.0 to 1.0) that all work will be completed by that date

**How to interpret it**: This is perhaps the most useful chart for communicating deadlines. You can pick a date and see the probability of finishing by then, or pick a confidence level (e.g., 80%) and find the corresponding date.

## Overall Interpretation

Together, these visualizations provide a data-driven forecast of when your project will likely complete based on historical performance. Key points:

1. The **50% date** is your "expected" completion date, but with substantial risk
2. The **85% date** is often recommended for planning, balancing optimism with realism
3. The **95% date** offers high confidence but may be quite conservative

Remember that all forecasts assume that future performance will resemble past performance. If you're planning process improvements or team changes, adjust your interpretation accordingly.


## Pre-requisites

python3

```
pip install pandas numpy matplotlib seaborn tqdm
```

## How to run (default)

1. Export your Jira issues into a csv file.

2. Run the following command:

```
python jira_forecast.py path/to/your/jira_export.csv
```

## How to run (customized columns example)

1. Export your Jira issues into a csv file.

2. Run the following command:

```
python jira_forecast.py jira_export.csv --created "Created Date" --resolved "Resolution Date" --status "State"
```
