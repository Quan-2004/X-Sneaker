import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const db = getFirebaseDatabase();

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

function initDashboard() {
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Dashboard: User authenticated, fetching stats...');
            setupListeners();
        } else {
            console.log('Dashboard: No user, skipping fetch.');
        }
    });
}

function setupListeners() {
    // 1. Total Revenue & Orders
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        let totalRevenue = 0;
        let newOrdersCount = 0;
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                if (order.total) {
                    totalRevenue += parseInt(order.total);
                }
                newOrdersCount++;
            });
        }

        const revEl = document.getElementById('stat-revenue');
        const ordEl = document.getElementById('stat-orders');
        
        if(revEl) revEl.textContent = formatCurrency(totalRevenue);
        if(ordEl) ordEl.textContent = newOrdersCount;
    }, (error) => {
        console.error("Error fetching orders:", error);
        const revEl = document.getElementById('stat-revenue');
        const ordEl = document.getElementById('stat-orders');
        if(revEl) revEl.textContent = "Error";
        if(ordEl) ordEl.textContent = "Error";
    });

    // 2. Total Users
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        const count = snapshot.size;
        const userEl = document.getElementById('stat-users');
        if(userEl) userEl.innerText = count;
    }, (error) => {
        console.error("Error fetching users:", error);
        const userEl = document.getElementById('stat-users');
        if(userEl) userEl.innerText = "Error";
    });

    // 3. Total Products
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const count = snapshot.size;
        document.getElementById('stat-products').innerText = count;
    }, (error) => {
        console.error("Error fetching products:", error);
        document.getElementById('stat-products').innerText = "Error";
    });
}

// Start immediately
initDashboard();
