// Blog List Page for X-Sneaker
// Loads and renders blog posts from Firebase Realtime Database

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get, query, orderByChild, limitToFirst } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const database = getFirebaseDatabase();

// Global state
let allBlogs = [];
let filteredBlogs = [];
let currentCategory = 'all';
let currentSearchTerm = '';

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadBlogs(limit = 12) {
    try {
        const blogsRef = ref(database, 'blogs');
        const snapshot = await get(blogsRef);
        
        if (snapshot.exists()) {
            const blogsData = snapshot.val();
            allBlogs = Object.keys(blogsData)
                .map(key => ({ id: key, ...blogsData[key] }))
                .sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0));
            
            filteredBlogs = allBlogs.slice(0, limit);
            console.log(`✅ Loaded ${allBlogs.length} blogs from Firebase`);
            return filteredBlogs;
        }
        
        console.warn('⚠️ No blogs found in Firebase');
        return [];
    } catch (error) {
        console.error('❌ Error loading blogs:', error);
        return [];
    }
}

// ============================================================================
// FILTERING & SEARCHING
// ============================================================================

function filterBlogs() {
    let result = [...allBlogs];
    
    // Filter by category
    if (currentCategory !== 'all') {
        result = result.filter(blog => 
            blog.category && blog.category.toLowerCase() === currentCategory.toLowerCase()
        );
    }
    
    // Filter by search term
    if (currentSearchTerm.trim()) {
        const searchLower = currentSearchTerm.toLowerCase();
        result = result.filter(blog => {
            const titleMatch = blog.title?.toLowerCase().includes(searchLower);
            const excerptMatch = blog.excerpt?.toLowerCase().includes(searchLower);
            const contentMatch = blog.content?.toLowerCase().includes(searchLower);
            return titleMatch || excerptMatch || contentMatch;
        });
    }
    
    filteredBlogs = result;
    renderBlogs(filteredBlogs);
    
    // Update URL
    updateURL();
    
    console.log(`🔍 Filtered: ${filteredBlogs.length} blogs (category: ${currentCategory}, search: "${currentSearchTerm}")`);
}

function searchBlogs(searchTerm) {
    currentSearchTerm = searchTerm;
    filterBlogs();
}

function filterByCategory(category) {
    currentCategory = category;
    
    // Update active state on category buttons
    document.querySelectorAll('.category-filter').forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        if (btnCategory === category) {
            btn.classList.add('bg-primary/20');
            btn.classList.remove('hover:bg-primary/10');
            btn.querySelector('span:last-child').classList.add('font-bold');
        } else {
            btn.classList.remove('bg-primary/20');
            btn.classList.add('hover:bg-primary/10');
            btn.querySelector('span:last-child').classList.remove('font-bold');
        }
    });
    
    filterBlogs();
}

function updateURL() {
    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    if (currentSearchTerm.trim()) params.set('search', currentSearchTerm);
    
    const newURL = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    
    window.history.replaceState({}, '', newURL);
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const search = params.get('search');
    
    if (category) {
        currentCategory = category;
        filterByCategory(category);
    }
    
    if (search) {
        currentSearchTerm = search;
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) searchInput.value = search;
        filterBlogs();
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderBlogs(blogs) {
    const container = document.getElementById('blogs-container');
    if (!container) return;
    
    if (blogs.length === 0) {
        const message = currentSearchTerm || currentCategory !== 'all'
            ? 'Không tìm thấy bài viết nào phù hợp'
            : 'Chưa có bài viết nào';
        
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">article</span>
                <p class="text-xl font-bold text-gray-500">${message}</p>
                <p class="text-gray-400 mt-2">
                    ${currentSearchTerm || currentCategory !== 'all' 
                        ? 'Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.' 
                        : 'Hãy quay lại sau nhé!'}
                </p>
                ${currentSearchTerm || currentCategory !== 'all' ? `
                    <button onclick="window.location.href='Blog-list.html'" class="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                        Xem Tất Cả Bài Viết
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = blogs.map(blog => {
        const thumbnail = blog.thumbnailImage || 'image/coming_soon.png';
        const publishedDate = blog.publishedDate ? formatDate(blog.publishedDate) : 'N/A';
        const excerpt = blog.excerpt || 'Đọc thêm để khám phá...';
        
        return `
            <article class="bg-white dark:bg-background-dark rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-primary/20 group">
                <a href="Blog-detail.html?id=${blog.id}" class="block">
                    <div class="aspect-video bg-gray-100 overflow-hidden">
                        <img src="${thumbnail}" 
                             alt="${blog.title}"
                             class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             onerror="this.src='image/coming_soon.png'"/>
                    </div>
                </a>
                <div class="p-6">
                    <div class="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">calendar_today</span>
                            ${publishedDate}
                        </span>
                        ${blog.category ? `
                            <span class="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase">
                                ${blog.category}
                            </span>
                        ` : ''}
                        ${blog.views ? `
                            <span class="flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">visibility</span>
                                ${formatNumber(blog.views)}
                            </span>
                        ` : ''}
                    </div>
                    <a href="Blog-detail.html?id=${blog.id}">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            ${blog.title}
                        </h3>
                    </a>
                    <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                        ${excerpt}
                    </p>
                    ${blog.author ? `
                        <div class="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                ${blog.author.avatar ? `
                                    <img src="${blog.author.avatar}" alt="${blog.author.name}" class="w-full h-full rounded-full object-cover"/>
                                ` : `
                                    <span class="text-primary font-bold text-sm">${blog.author.name?.charAt(0) || 'A'}</span>
                                `}
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white">${blog.author.name || 'Admin'}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function showLoadingSkeleton() {
    const container = document.getElementById('blogs-container');
    if (!container) return;
    
    const skeletons = Array(6).fill(0).map(() => `
        <div class="bg-white dark:bg-background-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div class="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div class="p-6 space-y-3">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = skeletons;
}

// ============================================================================
// UTILITY
// ============================================================================

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('blog-search-input');
    const searchBtn = document.getElementById('blog-search-btn');
    
    if (searchInput) {
        // Search on Enter key
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchBlogs(searchInput.value);
            }
        });
        
        // Real-time search with debounce
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchBlogs(e.target.value);
            }, 500);
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchBlogs(searchInput.value);
            }
        });
    }
    
    // Category filters
    document.querySelectorAll('.category-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = btn.getAttribute('data-category');
            filterByCategory(category);
        });
    });
    
    console.log('✅ Event listeners setup complete');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing blog list page...');
    
    showLoadingSkeleton();
    
    await loadBlogs(100); // Load more blogs for filtering
    
    // Setup event listeners
    setupEventListeners();
    
    // Load filters from URL
    loadFromURL();
    
    // If no URL params, show all blogs
    if (currentCategory === 'all' && !currentSearchTerm) {
        renderBlogs(filteredBlogs);
    }
    
    console.log('✅ Blog list initialized');
}

document.addEventListener('DOMContentLoaded', init);

console.log('✅ Blog module loaded');
