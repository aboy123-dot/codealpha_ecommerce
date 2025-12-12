const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// SECURITY: Only serve files from 'public'. 
// 'data' folder is NOT served, so users cannot access json files directly.
app.use(express.static('public'));

// Helpers
const dataPath = (file) => path.join(__dirname, 'data', file);
const readData = (file) => {
    if (!fs.existsSync(dataPath(file))) return []; // Safety check
    return JSON.parse(fs.readFileSync(dataPath(file)));
};
const writeData = (file, data) => fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));

// --- ROUTES ---

// 1. Products
app.get('/api/products', (req, res) => res.json(readData('products.json')));

// 2. Auth
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const users = readData('users.json');
    if (users.find(u => u.username === username)) return res.status(400).json({ message: "User exists" });
    users.push({ id: Date.now(), username, password });
    writeData('users.json', users);
    res.json({ message: "Registered! Please login." });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readData('users.json');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ message: "Success", user: { username: user.username } });
    else res.status(401).json({ message: "Invalid credentials" });
});

// 3. Orders & Dashboard
app.post('/api/orders', (req, res) => {
    const { username, cart, total } = req.body;
    const orders = readData('orders.json');
    
    const newOrder = {
        id: 'ORD-' + Date.now(), // Generate Order ID
        username,
        items: cart,
        total,
        status: 'Pending', // Add to waitlist
        date: new Date().toLocaleDateString()
    };
    
    orders.push(newOrder);
    writeData('orders.json', orders);
    res.json({ message: "Order Placed Successfully!", orderId: newOrder.id });
});

app.get('/api/history/:username', (req, res) => {
    const { username } = req.params;
    const orders = readData('orders.json');
    const userOrders = orders.filter(o => o.username === username);
    res.json(userOrders);
});

app.listen(PORT, () => console.log(`Codascope running at http://localhost:${PORT}`));