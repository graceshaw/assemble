# assemble

Perform probabilistic forecasting (Monte Carlo simulation) for your Jira project. Made with Claude.ai.

![alt text](https://github.com/graceshaw/assemble/blob/main/src/jira_forecast.jpg?raw=true)

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