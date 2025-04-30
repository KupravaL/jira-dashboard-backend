const express = require('express');
const cors = require('cors');
const jiraRoutes = require('./routes/jira');
const prioritiesRoutes = require('./routes/priorities');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/jira', jiraRoutes);
app.use('/api/priorities', prioritiesRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 