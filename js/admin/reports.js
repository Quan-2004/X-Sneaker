import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const db = getFirebaseDatabase();

// State
let allOrders = [];
let allProducts = {};
let currentPeriod = '30'; // Default 30 days
let charts = {
    sales: null,
    category: null
};

// Formatting Utilities
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '$'); // Using $ for UI consistency with mockup, or VND if preferred. The mockup used $. But orders.js used VND.
// Wait, orders.js used VND. I should use VND to be consistent with orders.js unless user wants USD.
// orders.js: return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
// admin.html mockup (Report tab) used $.
// I should probably switch to VND to match the rest of the application (orders, products).
// "124,563" in template.
// I will use VND.

const formatVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

/**
 * Initialize Reports Module
 */
function init() {
    console.log('Reports Module Initialized');
    // Auto-load data on init
    reload();
}

/**
 * Reload Data
 */
async function reload() {
    // Show Loading state if needed
    
    try {
        // 1. Fetch Products (for Category/Name lookup)
        const productsSnapshot = await get(ref(db, 'products'));
        allProducts = productsSnapshot.val() || {};

        // 2. Fetch Orders
        const ordersRef = query(ref(db, 'orders'), orderByChild('createdAt'));
        const ordersSnapshot = await get(ordersRef);
        
        allOrders = [];
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach(child => {
                allOrders.push({
                    key: child.key,
                    ...child.val()
                });
            });
        }

        // 3. Process Data
        processData();

    } catch (error) {
        console.error("Error loading report data:", error);
    }
}

/**
 * Update Time Period
 */
function updatePeriod(period) {
    currentPeriod = period;
    processData();
}

/**
 * Process Data and Render stats/charts
 */
function processData() {
    // Filter orders by period & status
    const now = new Date();
    let startDate = new Date(0); // Beginning of time

    if (currentPeriod === '7') {
        startDate.setDate(now.getDate() - 7);
    } else if (currentPeriod === '30') {
        startDate.setDate(now.getDate() - 30);
    } else if (currentPeriod === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    // 'all' keeps startDate as 0

    const validOrders = allOrders.filter(o => {
        // Filter by date
        const oDate = new Date(o.createdAt);
        if (oDate < startDate) return false;
        
        // Filter by status (only count delivered/completed for revenue? or all non-cancelled?)
        // Usually Revenue = Delivered + Shipped or just Delivered.
        // Let's use all except cancelled for "Sales" activity, but for "Revenue" strict accounting usually means Delivered.
        // For dashboard trends, usually we show what's happening.
        // I will exclude 'cancelled'.
        return (o.status !== 'cancelled');
    });

    const deliveredOrders = validOrders.filter(o => o.status === 'delivered');

    // --- Metrics ---
    let totalRevenue = 0;
    deliveredOrders.forEach(o => {
        totalRevenue += parseFloat(o.total || 0);
    });

    const totalOrdersCount = validOrders.length;
    const aov = totalOrdersCount > 0 ? totalRevenue / deliveredOrders.length : 0; // AOV usually based on revenue generating orders

    // Update UI Metrics
    setText('report-revenue', formatVND(totalRevenue));
    setText('report-aov', formatVND(aov || 0));
    setText('report-orders', totalOrdersCount);

    // --- Prepare Chart Data ---
    
    // 1. Sales Trend (Revenue by Date)
    const salesByDate = {};
    validOrders.forEach(o => {
        if (o.status === 'cancelled') return;
        const date = new Date(o.createdAt).toLocaleDateString('vi-VN'); // dd/mm/yyyy
        salesByDate[date] = (salesByDate[date] || 0) + parseFloat(o.total || 0);
    });

    // 2. Category Performance (by Brand)
    const salesByBrand = {};
    // 3. Top Products
    const productStats = {};

    validOrders.forEach(o => {
        if (o.status === 'cancelled') return;
        if (!o.items) return;

        o.items.forEach(item => {
            const product = allProducts[item.id] || {};
            const brand = product.brand || 'Other';
            const revenue = (item.price * item.quantity);

            // Category (Brand)
            salesByBrand[brand] = (salesByBrand[brand] || 0) + revenue;

            // Product Stats
            if (!productStats[item.id]) {
                productStats[item.id] = {
                    name: item.name,
                    qty: 0,
                    revenue: 0,
                    image: item.image
                };
            }
            productStats[item.id].qty += item.quantity;
            productStats[item.id].revenue += revenue;
        });
    });

    renderCharts(salesByDate, salesByBrand);
    renderTopProducts(productStats);
}

/**
 * Render Charts using Chart.js
 */
function renderCharts(salesData, brandData) {
    // --- Sales Chart ---
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        if (charts.sales) charts.sales.destroy();

        charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: Object.keys(salesData),
                datasets: [{
                    label: 'Revenue (VND)',
                    data: Object.values(salesData),
                    borderColor: '#e71823', // Primary color
                    backgroundColor: 'rgba(231, 24, 35, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // --- Category Chart ---
    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        if (charts.category) charts.category.destroy();

        const brands = Object.keys(brandData);
        const data = Object.values(brandData);
        
        // Colors palette
        const colors = ['#e71823', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

        charts.category = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: brands,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, brands.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

/**
 * Render Top Products Table
 */
function renderTopProducts(stats) {
    const tbody = document.getElementById('report-top-products');
    if (!tbody) return;

    const sorted = Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    tbody.innerHTML = sorted.map(p => `
        <tr class="border-b border-slate-100 dark:border-border-dark last:border-0">
            <td class="py-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : ''}
                    </div>
                    <span class="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">${p.name}</span>
                </div>
            </td>
            <td class="py-3 text-sm text-slate-600 dark:text-slate-400">${p.qty}</td>
            <td class="py-3 text-sm font-bold text-slate-900 dark:text-white">${formatVND(p.revenue)}</td>
        </tr>
    `).join('');
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-slate-500">No data available</td></tr>';
    }
}

// Helpers
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Export
window.reportsModule = {
    init,
    reload,
    updatePeriod
};

// Start
init();
