// Blog Detail Page for X-Sneaker
// Loads and displays single blog post from Firebase

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const database = getFirebaseDatabase();

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadBlog(blogId) {
    try {
        const blogRef = ref(database, `blogs/${blogId}`);
        const snapshot = await get(blogRef);
        
        if (snapshot.exists()) {
            const blog = { id: blogId, ...snapshot.val() };
            console.log('✅ Loaded blog:', blog.title);
            
            // Increment view count
            await incrementViews(blogId);
            
            return blog;
        }
        
        console.error('❌ Blog not found:', blogId);
        return null;
    } catch (error) {
        console.error('❌ Error loading blog:', error);
        return null;
    }
}

async function incrementViews(blogId) {
    try {
        const blogRef = ref(database, `blogs/${blogId}`);
        const snapshot = await get(blogRef);
        
        if (snapshot.exists()) {
            const currentViews = snapshot.val().views || 0;
            await update(blogRef, { views: currentViews + 1 });
        }
    } catch (error) {
        console.error('Error incrementing views:', error);
    }
}

async function loadRelatedBlogs(category, currentBlogId, limit = 3) {
    try {
        const blogsRef = ref(database, 'blogs');
        const snapshot = await get(blogsRef);
        
        if (snapshot.exists()) {
            const blogsData = snapshot.val();
            const relatedBlogs = Object.keys(blogsData)
                .filter(key => key !== currentBlogId && blogsData[key].category === category)
                .map(key => ({ id: key, ...blogsData[key] }))
                .sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0))
                .slice(0, limit);
            
            return relatedBlogs;
        }
        
        return [];
    } catch (error) {
        console.error('Error loading related blogs:', error);
        return [];
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderBlog(blog) {
    if (!blog) {
        showError();
        return;
    }
    
    // Update page title
    document.title = `${blog.title} | X-Sneaker Blog`;
    
    // Update breadcrumb
    const breadcrumb = document.querySelector('.text-sm.font-bold.leading-normal');
    if (breadcrumb) {
        breadcrumb.textContent = blog.title;
    }
    
    // Render blog header
    const headerContainer = document.querySelector('.blog-header') || document.querySelector('main > div > div');
    if (headerContainer) {
        headerContainer.innerHTML = `
            <div class="mb-8">
                ${blog.category ? `
                    <span class="inline-block bg-primary text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-4">
                        ${blog.category}
                    </span>
                ` : ''}
                <h1 class="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-6">
                    ${blog.title}
                </h1>
                <div class="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400">
                    ${blog.author ? `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                ${blog.author.avatar ? `
                                    <img src="${blog.author.avatar}" alt="${blog.author.name}" class="w-full h-full object-cover"/>
                                ` : `
                                    <span class="text-primary font-bold">${blog.author.name?.charAt(0) || 'A'}</span>
                                `}
                            </div>
                            <div>
                                <p class="font-bold text-gray-900 dark:text-white">${blog.author.name || 'Admin'}</p>
                                <p class="text-xs">Author</p>
                            </div>
                        </div>
                    ` : ''}
                    ${blog.publishedDate ? `
                        <span class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">calendar_today</span>
                            ${formatDate(blog.publishedDate)}
                        </span>
                    ` : ''}
                    ${blog.views ? `
                        <span class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                            ${formatNumber(blog.views)} lượt xem
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Render featured image
    if (blog.thumbnailImage) {
        const imageContainer = document.querySelector('.blog-image') || document.createElement('div');
        imageContainer.className = 'blog-image mb-10';
        imageContainer.innerHTML = `
            <div class="aspect-video rounded-xl overflow-hidden">
                <img src="${blog.thumbnailImage}" 
                     alt="${blog.title}"
                     class="w-full h-full object-cover"
                     onerror="this.src='https://via.placeholder.com/1200x600?text=Blog+Image'"/>
            </div>
        `;
        
        if (!document.querySelector('.blog-image')) {
            headerContainer.after(imageContainer);
        }
    }
    
    // Render content
    const contentContainer = document.querySelector('.blog-content') || document.querySelector('.prose');
    if (contentContainer) {
        contentContainer.innerHTML = blog.content || '<p>Nội dung đang được cập nhật...</p>';
    }
    
    // Render tags
    if (blog.tags && blog.tags.length > 0) {
        const tagsContainer = document.querySelector('.blog-tags') || document.createElement('div');
        tagsContainer.className = 'blog-tags mt-8 pt-8 border-t border-gray-200 dark:border-gray-800';
        tagsContainer.innerHTML = `
            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
            <div class="flex flex-wrap gap-2">
                ${blog.tags.map(tag => `
                    <span class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer">
                        ${tag}
                    </span>
                `).join('')}
            </div>
        `;
        
        if (!document.querySelector('.blog-tags') && contentContainer) {
            contentContainer.after(tagsContainer);
        }
    }
}

function renderRelatedBlogs(blogs) {
    const container = document.getElementById('related-blogs');
    if (!container || blogs.length === 0) return;
    
    container.innerHTML = `
        <h3 class="text-2xl font-black mb-6">Bài Viết Liên Quan</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${blogs.map(blog => `
                <a href="Blog-detail.html?id=${blog.id}" class="group">
                    <div class="bg-white dark:bg-background-dark rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-primary/20">
                        <div class="aspect-video bg-gray-100 overflow-hidden">
                            <img src="${blog.thumbnailImage || 'https://via.placeholder.com/400x300'}" 
                                 alt="${blog.title}"
                                 class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                        </div>
                        <div class="p-4">
                            <h4 class="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                ${blog.title}
                            </h4>
                            <p class="text-sm text-gray-500 flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs">calendar_today</span>
                                ${formatDate(blog.publishedDate)}
                            </p>
                        </div>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
}

function showError() {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="max-w-2xl mx-auto text-center py-20">
                <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                <h2 class="text-3xl font-bold mb-4">Không Tìm Thấy Bài Viết</h2>
                <p class="text-gray-500 mb-6">Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                <a href="Blog-list.html" class="inline-block bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors">
                    Quay Lại Danh Sách
                </a>
            </div>
        `;
    }
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

function getBlogIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing blog detail page...');
    
    const blogId = getBlogIdFromURL();
    
    if (!blogId) {
        console.error('❌ No blog ID in URL');
        showError();
        return;
    }
    
    const blog = await loadBlog(blogId);
    
    if (!blog) {
        showError();
        return;
    }
    
    renderBlog(blog);
    
    // Load related blogs
    if (blog.category) {
        const relatedBlogs = await loadRelatedBlogs(blog.category, blogId);
        renderRelatedBlogs(relatedBlogs);
    }
    
    console.log('✅ Blog detail initialized');
}

document.addEventListener('DOMContentLoaded', init);

console.log('✅ Blog detail module loaded');
