// export { handler } from './resolvers';

import ForgeUI, { 
  render,
  Fragment,
  Text,
  Button,
  AdminPage,
  Select,
  Option,
  Form,
  TextField,
  ButtonSet,
  Table,
  Head,
  Cell,
  Row
} from '@forge/ui';
import api, { route } from '@forge/api';

// Main UI component for the admin page
const App = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [iterationCount, setIterationCount] = useState(1000);
  const [forecastResults, setForecastResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch projects on initial load
  useEffect(async () => {
    const projectsData = await fetchProjects();
    setProjects(projectsData);
  }, []);

  const fetchProjects = async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/project`);
    const data = await response.json();
    return data.map(project => ({ id: project.id, key: project.key, name: project.name }));
  };

  const handleProjectChange = (value) => {
    setSelectedProject(value);
  };

  const runForecast = async (formData) => {
    setIsLoading(true);
    
    try {
      // Call our internal Monte Carlo API function
      const result = await api.runMonteCarlo({
        projectKey: selectedProject,
        iterations: parseInt(formData.iterations),
        confidenceLevels: [50, 70, 85, 95],
        simulationParams: {
          useHistoricalVelocity: formData.useHistoricalVelocity === 'true',
          periodCount: parseInt(formData.periodCount) || 6,
          includeBlockers: formData.includeBlockers === 'true'
        }
      });
      
      setForecastResults(result);
    } catch (error) {
      console.error('Error running forecast:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Fragment>
      <AdminPage>
        <Text size="largest">Probabilistic Forecasting for Jira</Text>
        <Text>Run Monte Carlo simulations to forecast project completion dates and scope delivery</Text>
        
        <Form onSubmit={runForecast} submitButtonText="Run Forecast">
          <Select 
            label="Select Project" 
            onChange={handleProjectChange}
            isRequired={true}
          >
            {projects.map(project => (
              <Option label={`${project.key} - ${project.name}`} value={project.key} />
            ))}
          </Select>
          
          <TextField 
            name="iterations" 
            label="Number of Simulations"
            defaultValue="1000"
            isRequired={true}
          />
          
          <Select 
            name="useHistoricalVelocity" 
            label="Use Historical Velocity" 
            isRequired={true}
          >
            <Option label="Yes" value="true" />
            <Option label="No" value="false" />
          </Select>
          
          <TextField 
            name="periodCount" 
            label="Number of Past Periods to Include"
            defaultValue="6"
            isRequired={true}
          />
          
          <Select 
            name="includeBlockers" 
            label="Account for Blockers" 
            isRequired={true}
          >
            <Option label="Yes" value="true" />
            <Option label="No" value="false" />
          </Select>
        </Form>
        
        {isLoading && <Text>Running simulations...</Text>}
        
        {forecastResults && (
          <Fragment>
            <Text size="large">Forecast Results</Text>
            
            <Table>
              <Head>
                <Cell>Confidence Level</Cell>
                <Cell>Completion Date</Cell>
                <Cell>Remaining Days</Cell>
              </Head>
              {forecastResults.confidenceIntervals.map(interval => (
                <Row>
                  <Cell>{interval.confidence}%</Cell>
                  <Cell>{interval.completionDate}</Cell>
                  <Cell>{interval.daysRemaining}</Cell>
                </Row>
              ))}
            </Table>
            
            <Text size="medium">Probability Distribution</Text>
            {/* Would render a chart here if UI components supported it */}
            <Text>Monte Carlo simulation ran with {forecastResults.iterations} iterations</Text>
          </Fragment>
        )}
      </AdminPage>
    </Fragment>
  );
};

export const run = render(
  <App/>
);

// Monte Carlo API implementation
export const monteCarlo = async (req) => {
  const { projectKey, iterations, confidenceLevels, simulationParams } = req;
  
  // Fetch project data
  const issuesData = await fetchProjectIssues(projectKey);
  const velocityData = await fetchHistoricalVelocity(projectKey, simulationParams.periodCount);
  
  // Run Monte Carlo simulation
  const simulationResults = runMonteCarloSimulation(
    issuesData, 
    velocityData, 
    iterations, 
    simulationParams
  );
  
  // Calculate confidence intervals
  const confidenceIntervals = calculateConfidenceIntervals(
    simulationResults, 
    confidenceLevels
  );
  
  return {
    iterations,
    confidenceIntervals,
    simulationSummary: {
      mean: calculateMean(simulationResults),
      median: calculateMedian(simulationResults),
      standardDeviation: calculateStandardDeviation(simulationResults)
    }
  };
};

// Function to fetch project issues
const fetchProjectIssues = async (projectKey) => {
  const jql = `project = ${projectKey} AND status != Done`;
  const response = await api.asApp().requestJira(
    route`/rest/api/3/search?jql=${jql}&fields=summary,status,customfield_10024,customfield_10016`
  );
  return await response.json();
};

// Function to fetch historical velocity
const fetchHistoricalVelocity = async (projectKey, periodCount) => {
  // This would typically fetch completed sprints or time periods
  // and calculate the completed story points per period
  
  // Mock implementation for example purposes
  const response = await api.asApp().requestJira(
    route`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`
  );
  const boardsData = await response.json();
  
  if (boardsData.values && boardsData.values.length > 0) {
    const boardId = boardsData.values[0].id;
    const sprintsResponse = await api.asApp().requestJira(
      route`/rest/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=${periodCount}`
    );
    const sprintsData = await sprintsResponse.json();
    
    // For each sprint, we would fetch completed story points
    // This is a simplified example
    return {
      velocities: [21, 18, 23, 19, 22, 20], // Mock data
      mean: 20.5,
      stdDev: 1.87
    };
  }
  
  return {
    velocities: [],
    mean: 0,
    stdDev: 0
  };
};

// Function to run Monte Carlo simulation
const runMonteCarloSimulation = (issuesData, velocityData, iterations, params) => {
  const totalStoryPoints = calculateTotalRemainingStoryPoints(issuesData);
  const simulationResults = [];
  
  for (let i = 0; i < iterations; i++) {
    let remainingPoints = totalStoryPoints;
    let periodsRequired = 0;
    
    while (remainingPoints > 0) {
      // Sample from velocity distribution
      const velocity = sampleVelocity(velocityData);
      
      // Apply random blockers if configured
      const effectiveVelocity = params.includeBlockers ? 
        applyRandomBlockers(velocity) : 
        velocity;
      
      remainingPoints -= effectiveVelocity;
      periodsRequired++;
    }
    
    simulationResults.push(periodsRequired);
  }
  
  return simulationResults;
};

// Helper function to calculate total remaining story points
const calculateTotalRemainingStoryPoints = (issuesData) => {
  // Sum up story points from all issues
  // customfield_10016 is often the story points field, but this can vary
  let total = 0;
  
  if (issuesData && issuesData.issues) {
    total = issuesData.issues.reduce((sum, issue) => {
      const storyPoints = issue.fields.customfield_10016 || 0;
      return sum + storyPoints;
    }, 0);
  }
  
  return total;
};

// Helper function to sample from velocity distribution
const sampleVelocity = (velocityData) => {
  // Simple implementation using normal distribution
  // In reality, you might use different distributions or bootstrapping
  const { mean, stdDev } = velocityData;
  
  // Box-Muller transform for normal distribution sampling
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  return Math.max(0, Math.round(mean + z * stdDev));
};

// Helper function to apply random blockers
const applyRandomBlockers = (velocity) => {
  // Occasionally reduce velocity to simulate blockers
  const blockerProbability = 0.2; // 20% chance of a blocker
  
  if (Math.random() < blockerProbability) {
    const impactPercentage = 0.2 + Math.random() * 0.4; // 20-60% impact
    return Math.round(velocity * (1 - impactPercentage));
  }
  
  return velocity;
};

// Helper function to calculate confidence intervals
const calculateConfidenceIntervals = (simulationResults, confidenceLevels) => {
  // Sort results to calculate percentiles
  const sortedResults = [...simulationResults].sort((a, b) => a - b);
  
  return confidenceLevels.map(level => {
    const index = Math.floor(sortedResults.length * (level / 100));
    const periodsRequired = sortedResults[index];
    
    // Convert periods to dates
    const today = new Date();
    const completionDate = new Date(today);
    // Assuming 2-week sprints, multiply by 14 days
    const daysToAdd = periodsRequired * 14;
    completionDate.setDate(today.getDate() + daysToAdd);
    
    return {
      confidence: level,
      periodsRequired,
      daysRemaining: daysToAdd,
      completionDate: completionDate.toISOString().split('T')[0]
    };
  });
};

// Statistical helper functions
const calculateMean = (array) => {
  return array.reduce((sum, value) => sum + value, 0) / array.length;
};

const calculateMedian = (array) => {
  const sortedArray = [...array].sort((a, b) => a - b);
  const middle = Math.floor(sortedArray.length / 2);
  
  if (sortedArray.length % 2 === 0) {
    return (sortedArray[middle - 1] + sortedArray[middle]) / 2;
  }
  
  return sortedArray[middle];
};

const calculateStandardDeviation = (array) => {
  const mean = calculateMean(array);
  const variance = array.reduce((sum, value) => {
    const diff = value - mean;
    return sum + (diff * diff);
  }, 0) / array.length;
  
  return Math.sqrt(variance);
};