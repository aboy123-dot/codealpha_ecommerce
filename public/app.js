let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = localStorage.getItem('user');
let authMode = 'login';
const API_URL = 'http://localhost:3000/api'; // Change to production URL when deploying

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUI();
    
    // Prevent direct url hash issues
    navigateTo('home');
});

// --- NAVIGATION SYSTEM ---
function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Show target view
    document.getElementById(`${viewId}-view`).classList.add('active');
    
    // Special checks
    if (viewId === 'dashboard') loadDashboard();
    window.scrollTo(0,0);
}

// --- PRODUCT & CART ---
async function fetchProducts() {
    const res = await fetch(`${API_URL}/products`);
    allProducts = await res.json();
    renderShop(allProducts);
}

function renderShop(products) {
    document.getElementById('product-list').innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.image}" loading="lazy">
            <div class="card-body">
                <h3>${p.name}</h3>
                <span class="price">$${p.price}</span>
                <button class="btn-add" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

function filterProducts(cat) {
    if (cat === 'all') renderShop(allProducts);
    else renderShop(allProducts.filter(p => p.category === cat));
}

function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    cart.push(product);
    updateUI();
    toggleCartSidebar(true);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateUI();
}

function toggleCartSidebar(forceOpen = null) {
    const sb = document.getElementById('cart-sidebar');
    if (forceOpen === true) sb.classList.add('open');
    else if (forceOpen === false) sb.classList.remove('open');
    else sb.classList.toggle('open');
}

// --- CHECKOUT & ORDERING ---
function goToCheckout() {
    if (!currentUser) {
        openModal('login');
        return;
    }
    if (cart.length === 0) return alert("Cart is empty");
    
    toggleCartSidebar(false);
    
    // Populate Checkout Summary
    const list = document.getElementById('checkout-items');
    let total = 0;
    list.innerHTML = cart.map(item => {
        total += item.price;
        return `<li>${item.name} <span>$${item.price}</span></li>`;
    }).join('');
    
    document.getElementById('checkout-total').innerText = total;
    navigateTo('checkout');
}

async function processOrder() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, cart, total })
    });
    
    const data = await res.json();
    
    if (res.ok) {
        cart = [];
        updateUI();
        document.getElementById('success-order-id').innerText = data.orderId;
        navigateTo('success');
    } else {
        alert("Order failed");
    }
}

// --- DASHBOARD ---
async function loadDashboard() {
    if (!currentUser) return navigateTo('home');
    
    const res = await fetch(`${API_URL}/history/${currentUser}`);
    const orders = await res.json();
    
    document.getElementById('dash-total-orders').innerText = orders.length;
    
    const tbody = document.getElementById('dash-history');
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.date || 'Today'}</td>
            <td>$${o.total}</td>
            <td><span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:4px;">${o.status}</span></td>
        </tr>
    `).join('');
}

// --- AUTHENTICATION ---
function openModal(mode) {
    authMode = mode;
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('modal-title');
    const switcher = document.getElementById('auth-switch');
    
    modal.style.display = 'flex';
    if(mode === 'login') {
        title.innerText = 'Login';
        switcher.innerHTML = `New? <a onclick="openModal('register')">Register</a>`;
    } else {
        title.innerText = 'Register';
        switcher.innerHTML = `Have account? <a onclick="openModal('login')">Login</a>`;
    }
}

function closeModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

async function handleAuth() {
    const u = document.getElementById('auth-user').value;
    const p = document.getElementById('auth-pass').value;
    const endpoint = authMode === 'login' ? '/login' : '/register';
    
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });
    
    const data = await res.json();
    if (res.ok) {
        if(authMode === 'login') {
            localStorage.setItem('user', data.user.username);
            currentUser = data.user.username;
            closeModal();
            updateUI();
            navigateTo('shop');
        } else {
            alert(data.message);
            openModal('login');
        }
    } else {
        alert(data.message);
    }
}

function logout() {
    localStorage.removeItem('user');
    currentUser = null;
    updateUI();
    navigateTo('home');
}

function updateUI() {
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Auth UI
    if (currentUser) {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('username-display').innerText = currentUser;
        document.getElementById('nav-dashboard').style.display = 'inline';
    } else {
        document.getElementById('auth-buttons').style.display = 'block';
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('nav-dashboard').style.display = 'none';
    }
    
    // Cart UI
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    document.getElementById('cart-items').innerHTML = cart.map((item, i) => {
        total += item.price;
        return `
            <div class="cart-item">
                <div>
                    <b>${item.name}</b><br>
                    <small>$${item.price}</small>
                </div>
                <button onclick="removeFromCart(${i})" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>
            </div>
        `;
    }).join('');
    document.getElementById('cart-total').innerText = total;
}