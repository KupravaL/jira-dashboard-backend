const express = require('express');
const axios = require('axios');
const router = express.Router();

// Ensure the API URL is properly formatted
const apiUrl = process.env.JIRA_API_URL?.trim().replace(/\/$/, '');
if (!apiUrl) {
  console.error('JIRA_API_URL is not configured in .env file');
  process.exit(1);
}

// Configure Axios instance for Jira API
const jiraApi = axios.create({
  baseURL: apiUrl,
  auth: {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Log configuration on startup (without sensitive data)
console.log('Jira API Configuration:');
console.log('Base URL:', apiUrl);
console.log('Email:', process.env.JIRA_EMAIL ? '✓ Set' : '✗ Missing');
console.log('API Token:', process.env.JIRA_API_TOKEN ? '✓ Set' : '✗ Missing');

// Verify credentials on startup
(async () => {
  try {
    const response = await jiraApi.get('/rest/api/3/myself');
    console.log('✅ Jira API connection verified');
    console.log('Connected as:', response.data.displayName);
  } catch (error) {
    console.error('❌ Failed to connect to Jira API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
})();

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    console.log('Fetching all projects...');
    const response = await jiraApi.get('/rest/api/3/project');
    console.log(`Successfully fetched ${response.data.length} projects`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    next(error);
  }
});

// Search issues with JQL (migrated to new /search/jql endpoint)
router.post('/search', async (req, res, next) => {
  try {
    let { jql, startAt = 0, maxResults = 50, fields } = req.body;

    // The new /search/jql API requires bounded queries with project or date restriction
    // Check if query already has a project restriction or created date filter
    const lowerJql = (jql || '').toLowerCase();
    const hasProjectRestriction = /project\s*(=|in)\s*/.test(lowerJql);
    const hasCreatedRestriction = /created\s*(>=|<=|>|<|=)\s*/.test(lowerJql);

    // Always add a date restriction if no project or created filter exists
    if (!hasProjectRestriction && !hasCreatedRestriction) {
      const restriction = 'created >= -365d';
      // Handle case where jql is just "ORDER BY ..."
      if (jql && jql.trim().toUpperCase().startsWith('ORDER BY')) {
        jql = `${restriction} ${jql}`;
      } else if (jql && jql.trim()) {
        jql = `${restriction} AND ${jql}`;
      } else {
        jql = restriction;
      }
    }

    console.log('Searching issues with JQL:', jql);

    const requestedFields = fields || [
      'summary',
      'description',
      'status',
      'priority',
      'assignee',
      'created',
      'updated',
      'project'
    ];

    const response = await jiraApi.get('/rest/api/3/search/jql', {
      params: {
        jql,
        startAt: parseInt(startAt),
        maxResults: parseInt(maxResults),
        fields: requestedFields.join(',')
      }
    });

    // Normalize response to match expected format
    const result = {
      issues: response.data.issues || [],
      startAt: parseInt(startAt),
      maxResults: parseInt(maxResults),
      total: response.data.total ?? response.data.issues?.length ?? 0
    };

    console.log(`Found ${result.total} issues`);
    res.json(result);
  } catch (error) {
    console.error('Error searching issues:', error.message);
    if (error.response) {
      console.error('Jira API Response:', error.response.data);
    }
    next(error);
  }
});

// Get project issues with advanced filtering
router.get('/:projectKey/issues', async (req, res, next) => {
  try {
    const { projectKey } = req.params;
    const { 
      startAt = 0, 
      maxResults = 50, 
      status, 
      priority,
      assignee,
      createdAfter,
      createdBefore 
    } = req.query;

    let jql = `project = ${projectKey}`;
    if (status) jql += ` AND status in (${Array.isArray(status) ? status.map(s => `"${s}"`).join(',') : `"${status}"`})`;
    if (priority) jql += ` AND priority in (${Array.isArray(priority) ? priority.map(p => `"${p}"`).join(',') : `"${priority}"`})`;
    if (assignee) jql += ` AND assignee = "${assignee}"`;
    if (createdAfter) jql += ` AND created >= "${createdAfter}"`;
    if (createdBefore) jql += ` AND created <= "${createdBefore}"`;
    jql += ' ORDER BY created DESC';

    const response = await jiraApi.get('/rest/api/3/search/jql', {
      params: {
        jql,
        startAt: parseInt(startAt),
        maxResults: parseInt(maxResults),
        fields: 'summary,status,priority,assignee,created,updated,description,duedate,project'
      }
    });

    // Normalize response to match expected format
    const result = {
      issues: response.data.issues || [],
      startAt: parseInt(startAt),
      maxResults: parseInt(maxResults),
      total: response.data.total ?? response.data.issues?.length ?? 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    next(error);
  }
});

// Get single issue details
router.get('/issue/:issueKey', async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const response = await jiraApi.get(`/rest/api/3/issue/${issueKey}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    next(error);
  }
});

// Get issue transitions
router.get('/issue/:issueKey/transitions', async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const response = await jiraApi.get(`/rest/api/3/issue/${issueKey}/transitions`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching transitions:', error.message);
    next(error);
  }
});

// Update issue status
router.post('/issue/:issueKey/transitions', async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const { transitionId } = req.body;

    if (!transitionId) {
      return res.status(400).json({ error: 'Transition ID is required' });
    }
    
    await jiraApi.post(`/rest/api/3/issue/${issueKey}/transitions`, {
      transition: { id: transitionId }
    });
    
    res.json({ message: 'Issue status updated successfully' });
  } catch (error) {
    console.error('Error updating issue status:', error.message);
    next(error);
  }
});

// Get project board configuration
router.get('/:projectKey/board', async (req, res, next) => {
  try {
    const { projectKey } = req.params;
    
    const boardsResponse = await jiraApi.get(`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
    
    if (!boardsResponse.data.values.length) {
      return res.status(404).json({ error: 'No board found for this project' });
    }

    const boardId = boardsResponse.data.values[0].id;
    const boardConfig = await jiraApi.get(`/rest/agile/1.0/board/${boardId}/configuration`);
    res.json(boardConfig.data);
  } catch (error) {
    console.error('Error fetching board configuration:', error.message);
    next(error);
  }
});

// Get project statuses
router.get('/:projectKey/statuses', async (req, res, next) => {
  try {
    const { projectKey } = req.params;
    const response = await jiraApi.get(`/rest/api/3/project/${projectKey}/statuses`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching project statuses:', error.message);
    next(error);
  }
});

// Get users (for assignee filter)
router.get('/users', async (req, res, next) => {
    try {
        const response = await jiraApi.get('/rest/api/3/users/search', {
            params: {
                maxResults: 1000
            }
        });
        console.log(`Successfully fetched ${response.data.length} users`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        next(error);
    }
});

module.exports = router; 