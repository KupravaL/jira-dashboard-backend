const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const PRIORITIES_FILE = path.join(__dirname, '../data/priorities.json');

// Ensure the data directory and file exist
const initializeStorage = async () => {
    try {
        await fs.mkdir(path.dirname(PRIORITIES_FILE), { recursive: true });
        try {
            await fs.access(PRIORITIES_FILE);
        } catch {
            await fs.writeFile(PRIORITIES_FILE, '{}');
        }
    } catch (error) {
        console.error('Error initializing priorities storage:', error);
    }
};

// Initialize storage on startup
initializeStorage();

// Get all priorities
router.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(PRIORITIES_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading priorities:', error);
        res.status(500).json({ error: 'Failed to read priorities' });
    }
});

// Set priority for an issue
router.post('/:issueKey', async (req, res) => {
    try {
        const { issueKey } = req.params;
        const { priority } = req.body;

        if (!priority) {
            return res.status(400).json({ error: 'Priority is required' });
        }

        const data = await fs.readFile(PRIORITIES_FILE, 'utf8');
        const priorities = JSON.parse(data);
        
        priorities[issueKey] = priority;
        
        await fs.writeFile(PRIORITIES_FILE, JSON.stringify(priorities, null, 2));
        
        res.json({ message: 'Priority updated successfully' });
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: 'Failed to update priority' });
    }
});

// Remove priority for an issue
router.delete('/:issueKey', async (req, res) => {
    try {
        const { issueKey } = req.params;
        
        const data = await fs.readFile(PRIORITIES_FILE, 'utf8');
        const priorities = JSON.parse(data);
        
        delete priorities[issueKey];
        
        await fs.writeFile(PRIORITIES_FILE, JSON.stringify(priorities, null, 2));
        
        res.json({ message: 'Priority removed successfully' });
    } catch (error) {
        console.error('Error removing priority:', error);
        res.status(500).json({ error: 'Failed to remove priority' });
    }
});

// Clear all priorities
router.delete('/', async (req, res) => {
    try {
        await fs.writeFile(PRIORITIES_FILE, '{}');
        res.json({ message: 'All priorities cleared successfully' });
    } catch (error) {
        console.error('Error clearing priorities:', error);
        res.status(500).json({ error: 'Failed to clear priorities' });
    }
});

module.exports = router; 