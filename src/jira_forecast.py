import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import seaborn as sns
from tqdm import tqdm
import matplotlib.dates as mdates

def load_jira_data(file_path):
    """
    Load and prepare Jira CSV data
    """
    print(f"Loading data from {file_path}...")
    df = pd.read_csv(file_path)
    
    # Print column names to help identify key fields
    print("Available columns:", df.columns.tolist())
    
    return df

def prepare_data(df, created_field='Created', resolved_field='Resolved', 
                 status_field='Status', issue_type_field='Issue Type'):
    """
    Prepare Jira data for analysis
    """
    # Convert date fields to datetime
    for field in [created_field, resolved_field]:
        if field in df.columns:
            df[field] = pd.to_datetime(df[field])
    
    # Calculate cycle time for completed issues
    completed_issues = df[df[status_field].isin(['Done', 'Closed', 'Resolved'])]
    if len(completed_issues) == 0:
        raise ValueError("No completed issues found in dataset")
    
    if resolved_field in completed_issues.columns:
        completed_issues['cycle_time'] = (completed_issues[resolved_field] - 
                                         completed_issues[created_field]).dt.days
        # Filter out any negative cycle times
        completed_issues = completed_issues[completed_issues['cycle_time'] >= 0]
    
    # Get remaining issues
    remaining_issues = df[~df[status_field].isin(['Done', 'Closed', 'Resolved'])]
    
    print(f"Completed issues: {len(completed_issues)}")
    print(f"Remaining issues: {len(remaining_issues)}")
    
    return completed_issues, remaining_issues

def run_monte_carlo(completed_issues, remaining_issues, num_simulations=1000, 
                   throughput_period='W', throughput_field='cycle_time'):
    """
    Run Monte Carlo simulation
    
    Parameters:
    - completed_issues: DataFrame of completed issues with cycle_time
    - remaining_issues: DataFrame of remaining issues
    - num_simulations: Number of Monte Carlo simulations to run
    - throughput_period: Period to group throughput by ('D', 'W', 'M')
    - throughput_field: Field to analyze for throughput
    
    Returns:
    - Dictionary with simulation results
    """
    print(f"Running {num_simulations} Monte Carlo simulations...")
    
    # Analyze historical throughput
    if throughput_period == 'D':
        period_name = 'daily'
    elif throughput_period == 'W':
        period_name = 'weekly'
    else:
        period_name = 'monthly'
    
    # Get total number of remaining items
    remaining_count = len(remaining_issues)
    
    # Calculate historical cycle times
    cycle_times = completed_issues[throughput_field].dropna().values
    
    if len(cycle_times) == 0:
        raise ValueError("No valid cycle time data found")
    
    # Calculate historical throughput (items completed per period)
    if 'Resolved' in completed_issues.columns:
        throughput = completed_issues.groupby(pd.Grouper(
            key='Resolved', freq=throughput_period)).size()
        throughput = throughput[throughput > 0]  # Remove periods with zero throughput
    else:
        # If no resolved date, use average cycle time as a proxy
        avg_cycle_time = np.mean(cycle_times)
        print(f"No resolved date field. Using average cycle time: {avg_cycle_time:.2f} days")
        throughput = pd.Series([len(completed_issues) / (avg_cycle_time / 7)]) if throughput_period == 'W' else pd.Series([1])
    
    # Calculate completion dates using Monte Carlo simulation
    completion_dates = []
    today = datetime.now().date()
    
    for _ in tqdm(range(num_simulations)):
        if len(throughput) > 0:
            # Randomly sample from historical throughput
            sampled_throughputs = np.random.choice(throughput, size=100, replace=True)
            
            # Calculate how many periods it would take to complete all remaining work
            cumulative_work = np.cumsum(sampled_throughputs)
            periods_needed = np.searchsorted(cumulative_work, remaining_count, side='left')
            
            if periods_needed < len(cumulative_work):
                # Convert periods to days - FIX: Convert numpy.int64 to Python int
                if throughput_period == 'W':
                    days_to_add = int(periods_needed * 7)
                elif throughput_period == 'M':
                    days_to_add = int(periods_needed * 30)
                else:
                    days_to_add = int(periods_needed)
                
                completion_date = today + timedelta(days=days_to_add)
                completion_dates.append(completion_date)
    
    # Calculate percentiles
    if completion_dates:
        completion_dates.sort()
        percentiles = {
            50: completion_dates[int(len(completion_dates) * 0.5)],
            75: completion_dates[int(len(completion_dates) * 0.75)],
            85: completion_dates[int(len(completion_dates) * 0.85)],
            95: completion_dates[int(len(completion_dates) * 0.95)]
        }
    else:
        percentiles = {50: None, 75: None, 85: None, 95: None}
        
    return {
        'completion_dates': completion_dates,
        'percentiles': percentiles,
        'throughput': throughput,
        'cycle_times': cycle_times
    }

def visualize_results(results):
    """
    Visualize Monte Carlo simulation results
    """
    if not results['completion_dates']:
        print("No valid completion dates to visualize")
        return
    
    # Create a figure with subplots
    fig, axs = plt.subplots(2, 2, figsize=(14, 10))
    
    # Plot 1: Completion Date Distribution
    completion_dates = pd.Series(results['completion_dates'])
    ax = axs[0, 0]
    sns.histplot(completion_dates, ax=ax, kde=True)
    ax.set_title('Forecast Completion Date Distribution')
    ax.set_xlabel('Completion Date')
    ax.set_ylabel('Frequency')
    
    # Fix x-axis date formatting to prevent squishing
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))  # Show every 2 weeks
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')  # Rotate labels
    
    # Add percentile lines
    percentiles = results['percentiles']
    for percent, date in percentiles.items():
        if date:
            ax.axvline(date, color='r', linestyle='--', alpha=0.7)
            ax.text(date, ax.get_ylim()[1]*0.9, f'{percent}%', 
                   rotation=90, verticalalignment='top')
    
    # Plot 2: Historical Cycle Time Distribution
    ax = axs[0, 1]
    sns.histplot(results['cycle_times'], ax=ax, kde=True)
    ax.set_title('Historical Cycle Time Distribution')
    ax.set_xlabel('Cycle Time (days)')
    ax.set_ylabel('Frequency')
    
    # Plot 3: Historical Throughput
    ax = axs[1, 0]
    results['throughput'].plot(ax=ax, kind='bar')
    ax.set_title('Historical Throughput')
    ax.set_xlabel('Period')
    ax.set_ylabel('Items Completed')
    
    # Fix x-axis date formatting for throughput
    if len(results['throughput']) > 10:
        # If too many periods, show every nth label
        interval = max(1, len(results['throughput']) // 10)
        for i, label in enumerate(ax.get_xticklabels()):
            if i % interval != 0:
                label.set_visible(False)
    
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')  # Rotate labels
    
    # Plot 4: Cumulative Probability of Completion
    ax = axs[1, 1]
    dates = pd.Series(results['completion_dates'])
    date_counts = dates.value_counts().sort_index().cumsum() / len(dates)
    date_counts.plot(ax=ax)
    ax.set_title('Cumulative Probability of Completion')
    ax.set_xlabel('Date')
    ax.set_ylabel('Probability')
    
    # Fix x-axis date formatting for cumulative probability
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))  # Show every 2 weeks
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')  # Rotate labels
    
    plt.tight_layout()
    plt.savefig('jira_forecast.png')
    print("Visualization saved as 'jira_forecast.png'")
    plt.show()

def main():
    """
    Main function to run the script
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Jira Monte Carlo Forecasting')
    parser.add_argument('file_path', help='Path to Jira CSV export file')
    parser.add_argument('--created', default='Created', help='Column name for created date')
    parser.add_argument('--resolved', default='Resolved', help='Column name for resolved date')
    parser.add_argument('--status', default='Status', help='Column name for status field')
    parser.add_argument('--issue-type', default='Issue Type', help='Column name for issue type')
    parser.add_argument('--simulations', type=int, default=1000, help='Number of Monte Carlo simulations')
    parser.add_argument('--period', default='W', choices=['D', 'W', 'M'], 
                        help='Period for throughput analysis (D=daily, W=weekly, M=monthly)')
    
    args = parser.parse_args()
    
    try:
        # Load data
        df = load_jira_data(args.file_path)
        
        # Prepare data
        completed_issues, remaining_issues = prepare_data(
            df, 
            created_field=args.created,
            resolved_field=args.resolved,
            status_field=args.status,
            issue_type_field=args.issue_type
        )
        
        # Run Monte Carlo simulation
        results = run_monte_carlo(
            completed_issues,
            remaining_issues,
            num_simulations=args.simulations,
            throughput_period=args.period
        )
        
        # Print results
        print("\nForecast Completion Dates (Percentiles):")
        for percent, date in results['percentiles'].items():
            print(f"{percent}% confidence: {date if date else 'N/A'}")
        
        # Visualize results
        visualize_results(results)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()