const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Use Database if DATABASE_URL is provided, otherwise fallback to local JSON for local testing
const useDB = !!process.env.DATABASE_URL;
let client;

if (useDB) {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    client.connect()
        .then(() => {
            console.log('Connected to PostgreSQL');
            // Create tables if they don't exist
            return client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    password TEXT NOT NULL,
                    data JSONB DEFAULT '{}'::jsonb
                );
            `);
        })
        .catch(err => console.error('Database connection error', err));
}

const USERS_FILE = path.join(__dirname, 'users.json');
const DATA_FILE = path.join(__dirname, 'user_data.json');

// Helper to ensure files exist for local fallback
if (!useDB) {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/signup') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                
                if (useDB) {
                    const check = await client.query('SELECT username FROM users WHERE username = $1', [username]);
                    if (check.rows.length > 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'User already exists' }));
                        return;
                    }
                    await client.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
                } else {
                    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
                    if (users.find(u => u.username === username)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'User already exists' }));
                        return;
                    }
                    users.push({ username, password });
                    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Signup successful' }));
            } catch (e) {
                console.error("Signup error:", e);
                res.writeHead(500); res.end();
            }
        });
    } else if (req.method === 'POST' && req.url === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                let user;

                if (useDB) {
                    const result = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
                    user = result.rows[0];
                } else {
                    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
                    user = users.find(u => u.username === username && u.password === password);
                }
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid credentials' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Login successful' }));
            } catch (e) {
                console.error("Login error:", e);
                res.writeHead(500); res.end();
            }
        });
    } else if (req.method === 'GET' && req.url.startsWith('/get-data')) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const username = url.searchParams.get('username');
            let data = {};

            if (useDB) {
                const result = await client.query('SELECT data FROM users WHERE username = $1', [username]);
                data = result.rows[0]?.data || {};
            } else {
                const userData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
                data = userData[username] || {};
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (e) {
            console.error("Get-data error:", e);
            res.writeHead(500); res.end();
        }
    } else if (req.method === 'POST' && req.url === '/save-data') {
        // ... (existing code)
    } else if (req.method === 'GET' && req.url.startsWith('/proxy-image')) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const imageUrl = url.searchParams.get('url');
            if (!imageUrl) {
                res.writeHead(400); res.end(); return;
            }

            const protocol = imageUrl.startsWith('https') ? require('https') : require('http');
            protocol.get(imageUrl, (imageRes) => {
                if (imageRes.statusCode !== 200) {
                    res.writeHead(imageRes.statusCode);
                    res.end();
                    return;
                }
                res.writeHead(200, { 
                    'Content-Type': imageRes.headers['content-type'],
                    'Access-Control-Allow-Origin': '*' 
                });
                imageRes.pipe(res);
            }).on('error', (e) => {
                console.error("Proxy error:", e);
                res.writeHead(500); res.end();
            });
        } catch (e) {
            res.writeHead(500); res.end();
        }
    } else {
        // Serve static files for simple hosting where frontend and backend are on same domain
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';
        
        const extname = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
        }[extname] || 'text/plain';

        fs.readFile(path.join(__dirname, filePath), (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running at port ${PORT} (DB: ${useDB ? 'Postgres' : 'JSON'})`);
});
