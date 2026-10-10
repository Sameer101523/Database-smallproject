const express = require('express');
const { Pool } = require('pg');

const app = express();

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'student_manager',
    password: '2315',
    port: 5432
});


// Add student
app.post('/students', async (req, res) => {
    try {
        const { name, course, attendance, marks } = req.body;

        const result = await pool.query(
            'INSERT INTO students (name, course, attendance, marks) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, course, attendance, marks]
        );

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// View all students
app.get('/students', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM students ORDER BY id'
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// View one student
app.get('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM students WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Update attendance and marks
app.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { attendance, marks } = req.body;

        const result = await pool.query(
            'UPDATE students SET attendance = $1, marks = $2 WHERE id = $3 RETURNING *',
            [attendance, marks, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete student
app.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM students WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({
            message: 'Student deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});