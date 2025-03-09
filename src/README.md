# Pre-requisites

'''
pip install pandas numpy matplotlib seaborn tqdm
'''

# How to run (default)

```
python jira_forecast.py path/to/your/jira_export.csv
```

# How to run (customized columns example)

```
python jira_forecast.py jira_export.csv --created "Created Date" --resolved "Resolution Date" --status "State"
```