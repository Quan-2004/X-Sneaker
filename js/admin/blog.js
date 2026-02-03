import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const blogsRef = ref(db, 'blogs');
const productsRef = ref(db, 'products');

let currentBlogs = {};
let selectedProducts = [];
let isInitialized = false;

// 1. Render Table
function renderTable(blogs) {
    const tableBody = document.getElementById('blog-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!blogs || Object.keys(blogs).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">No posts found.</td></tr>';
        return;
    }

    // Sort by publishedDate desc (or createdAt as fallback)
    const sortedBlogs = Object.entries(blogs).sort((a, b) => {
        const dateA = a[1].publishedDate || a[1].createdAt || 0;
        const dateB = b[1].publishedDate || b[1].createdAt || 0;
        return dateB - dateA;
    });

    sortedBlogs.forEach(([id, blog]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const imgUrl = blog.thumbnailImage ? getOptimizedImageUrl(blog.thumbnailImage, { width: 80, height: 60, crop: 'cover' }) : 'https://placehold.co/80x60';
        const dateStr = blog.publishedDate ? new Date(blog.publishedDate).toLocaleDateString('vi-VN') : (blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('vi-VN') : 'N/A');
        const authorName = blog.author?.name || blog.author || 'Admin';
        const featuredBadge = blog.featured ? '<span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">Featured</span>' : '';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="w-16 h-12 bg-slate-100 dark:bg-white/5 rounded-lg overflow-hidden border border-slate-200 dark:border-border-dark">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px]">${blog.title}</p>
                        <p class="text-xs text-slate-500 line-clamp-1 max-w-[200px] mt-0.5">${blog.excerpt || blog.summary || ''}</p>
                        ${blog.tags && blog.tags.length > 0 ? `<div class="flex flex-wrap gap-1 mt-1">${blog.tags.slice(0, 3).map(tag => `<span class="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">${tag}</span>`).join('')}</div>` : ''}
                    </div>
                    ${featuredBadge}
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <div class="text-sm font-medium text-slate-600 dark:text-slate-400">${authorName}</div>
                </div>
                <div class="text-xs text-slate-500 mt-0.5">${blog.category || 'Uncategorized'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-slate-500 dark:text-slate-400 text-xs font-mono">${dateStr}</div>
                <div class="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <span class="material-symbols-rounded text-[12px]">visibility</span>
                    <span>${blog.views || 0} views</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.blogModule.openEditModal('${id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Edit">
                        <span class="material-symbols-rounded text-[20px]">edit_note</span>
                    </button>
                    <button onclick="window.blogModule.deleteBlog('${id}')" class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Delete">
                        <span class="material-symbols-rounded text-[20px]">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadBlogs() {
    const tableBody = document.getElementById('blog-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8"><div class="loading-spinner mx-auto"></div></td></tr>';

    onValue(blogsRef, (snapshot) => {
        currentBlogs = snapshot.val() || {};
        renderTable(currentBlogs);
    }, (error) => {
        console.error(error);
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-rose-500">Error: ${error.message}</td></tr>`;
    });
}

function init() {
    if (isInitialized) return;
    
    const tableBody = document.getElementById('blog-table-body');
    if (!tableBody) {
        console.warn('Blog table not ready, skipping init');
        return;
    }
    
    // Auth Check (Optional here if core handles it, but good safety)
    const auth = getFirebaseAuth();
    
    isInitialized = true;
    loadBlogs();
}

// 3. Modal Handling
function openModal() {
    const modal = document.getElementById('blog-modal');
    if (!modal) return;
    
    // Reset Form
    document.getElementById('blog-form').reset();
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-slug').value = '';
    document.getElementById('blog-author-name').value = 'Admin X-Sneaker';
    document.getElementById('blog-author-avatar').value = 'https://ui-avatars.com/api/?name=Admin&background=FF3C3C&color=fff';
    document.getElementById('blog-image-url').value = '';
    document.getElementById('blog-featured').checked = false;
    document.getElementById('blog-published-date').value = '';
    
    // Reset selected products
    selectedProducts = [];
    renderSelectedProducts();
    
    // Reset preview
    document.getElementById('blog-image-preview').innerHTML = '<span class="material-symbols-rounded text-slate-400 text-5xl">add_photo_alternate</span><p class="text-xs text-slate-500 mt-2 font-semibold">Click to upload</p><p class="text-[10px] text-slate-400 mt-1">JPG, PNG, WebP (Max 2MB)</p>';
    
    // Hide stats section
    const statsDiv = document.getElementById('blog-stats');
    if (statsDiv) statsDiv.style.display = 'none';
    
    document.getElementById('blog-modal-title').innerText = 'Create New Post';
    document.getElementById('excerpt-count').textContent = '0';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('blog-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function openEditModal(id) {
    const blog = currentBlogs[id];
    if (!blog) return;

    document.getElementById('blog-id').value = id;
    document.getElementById('blog-title').value = blog.title || '';
    document.getElementById('blog-slug').value = blog.slug || '';
    document.getElementById('blog-author-name').value = blog.author?.name || 'Admin X-Sneaker';
    document.getElementById('blog-author-avatar').value = blog.author?.avatar || '';
    document.getElementById('blog-category').value = blog.category || '';
    document.getElementById('blog-excerpt').value = blog.excerpt || '';
    document.getElementById('blog-content').value = blog.content || '';
    document.getElementById('blog-image-url').value = blog.thumbnailImage || '';
    document.getElementById('blog-tags').value = blog.tags ? blog.tags.join(', ') : '';
    document.getElementById('blog-featured').checked = blog.featured || false;
    
    // Load featured products
    selectedProducts = [];
    if (blog.featuredProducts && blog.featuredProducts.length > 0) {
        try {
            const snapshot = await get(productsRef);
            if (snapshot.exists()) {
                const allProducts = snapshot.val();
                selectedProducts = blog.featuredProducts
                    .map(productId => {
                        const product = allProducts[productId];
                        if (product) {
                            return {
                                id: productId,
                                name: product.name,
                                image: product.images?.[0] || '',
                                price: product.price
                            };
                        }
                        return null;
                    })
                    .filter(p => p !== null);
            }
        } catch (error) {
            console.error('Error loading featured products:', error);
        }
    }
    renderSelectedProducts();
    
    // Set published date if exists
    if (blog.publishedDate) {
        const date = new Date(blog.publishedDate);
        const dateStr = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        document.getElementById('blog-published-date').value = dateStr;
    }
    
    // Update excerpt counter
    const excerptCount = document.getElementById('excerpt-count');
    if (excerptCount) {
        excerptCount.textContent = (blog.excerpt || '').length;
    }

    // Preview image
    const previewDiv = document.getElementById('blog-image-preview');
    if (blog.thumbnailImage) {
        previewDiv.innerHTML = `<img src="${blog.thumbnailImage}" class="w-full h-full object-cover rounded-xl">`;
    } else {
        previewDiv.innerHTML = '<span class="material-symbols-rounded text-slate-400 text-5xl">add_photo_alternate</span><p class="text-xs text-slate-500 mt-2 font-semibold">Click to upload</p>';
    }
    
    // Show stats
    const statsDiv = document.getElementById('blog-stats');
    if (statsDiv) {
        statsDiv.style.display = 'block';
        document.getElementById('blog-views').textContent = blog.views || 0;
        if (blog.createdAt) {
            const createdDate = new Date(blog.createdAt);
            document.getElementById('blog-created-at').textContent = createdDate.toLocaleDateString('vi-VN');
        }
    }

    document.getElementById('blog-modal-title').innerText = 'Edit Post';
    const modal = document.getElementById('blog-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// 4. Form Submission
async function saveBlog(e) {
    if (e) e.preventDefault();
    
    const form = document.getElementById('blog-form');
    if (!form) {
        console.error('Blog form not found');
        return;
    }
    
    // Button is outside form, use document.querySelector with form attribute
    const submitBtn = document.querySelector('button[type="submit"][form="blog-form"]') || 
                      form.querySelector('button[type="submit"]');
    
    if (!submitBtn) {
        console.error('Submit button not found');
        return;
    }
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-sm">rotate_right</span> Saving...';
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('blog-id')?.value || '';
        const fileInput = document.getElementById('blog-image-file');
        const file = fileInput?.files[0];
        let imageUrl = document.getElementById('blog-image-url')?.value || '';

        // Upload image if file selected
        if (file) {
            imageUrl = await uploadAvatarDirect(file);
        }
        
        // Parse tags from comma-separated string
        const tagsInput = document.getElementById('blog-tags')?.value || '';
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        // Get published date or use current time
        const publishedDateInput = document.getElementById('blog-published-date')?.value || '';
        const publishedDate = publishedDateInput ? new Date(publishedDateInput).getTime() : Date.now();

        const blogData = {
            title: document.getElementById('blog-title')?.value || '',
            slug: document.getElementById('blog-slug')?.value || '',
            author: {
                name: document.getElementById('blog-author-name')?.value || 'Admin',
                avatar: document.getElementById('blog-author-avatar')?.value || 'https://ui-avatars.com/api/?name=Admin&background=FF3C3C&color=fff'
            },
            category: document.getElementById('blog-category')?.value || '',
            excerpt: document.getElementById('blog-excerpt')?.value || '',
            content: document.getElementById('blog-content')?.value || '',
            thumbnailImage: imageUrl,
            tags: tags,
            featured: document.getElementById('blog-featured')?.checked || false,
            publishedDate: publishedDate,
            updatedAt: Date.now(),
            featuredProducts: selectedProducts.map(p => p.id) // Save only product IDs
        };

        if (id) {
            // Update existing blog (keep views and createdAt)
            const existingBlog = currentBlogs[id];
            blogData.views = existingBlog?.views || 0;
            blogData.createdAt = existingBlog?.createdAt || Date.now();
            await set(ref(db, `blogs/${id}`), blogData);
        } else {
            // Create new blog
            blogData.createdAt = Date.now();
            blogData.views = 0;
            await push(blogsRef, blogData);
        }

        closeModal();
        alert('✅ Post saved successfully!');
        
    } catch (error) {
        console.error('Error saving blog:', error);
        alert('❌ Failed to save post: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

async function deleteBlog(id) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        try {
            await remove(ref(db, `blogs/${id}`));
        } catch (error) {
            console.error(error);
            alert('Failed to delete post');
        }
    }
}

// Image Preview Handler
function handleImagePreview(e) {
    const file = e.target.files[0];
    const previewDiv = document.getElementById('blog-image-preview');
    if (file && previewDiv) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            previewDiv.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover rounded-lg">`;
        };
        reader.readAsDataURL(file);
    }
}

function reload() {
    console.log('Blog Module: Reloading...');
    
    // Bind modal close button events
    const btnCloseModal = document.getElementById('btn-close-blog-modal');
    if (btnCloseModal) {
        btnCloseModal.onclick = closeModal;
    }
    
    const btnCancelBlog = document.getElementById('btn-cancel-blog');
    if (btnCancelBlog) {
        btnCancelBlog.onclick = closeModal;
    }
    
    // Bind image upload preview
    const fileInput = document.getElementById('blog-image-file');
    if (fileInput) {
        fileInput.onchange = handleImagePreview;
    }
    
    // Auto-generate slug from title
    const titleInput = document.getElementById('blog-title');
    const slugInput = document.getElementById('blog-slug');
    if (titleInput && slugInput) {
        titleInput.oninput = (e) => {
            const slug = e.target.value
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[đĐ]/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            slugInput.value = slug;
        };
    }
    
    // Character counter for excerpt
    const excerptInput = document.getElementById('blog-excerpt');
    const excerptCount = document.getElementById('excerpt-count');
    if (excerptInput && excerptCount) {
        excerptInput.oninput = (e) => {
            excerptCount.textContent = e.target.value.length;
            if (e.target.value.length > 160) {
                excerptCount.classList.add('text-rose-500', 'font-bold');
            } else {
                excerptCount.classList.remove('text-rose-500', 'font-bold');
            }
        };
    }
    
    // Product search functionality
    const productSearchInput = document.getElementById('blog-product-search');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts(e.target.value);
            }, 300);
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            const resultsContainer = document.getElementById('blog-product-results');
            if (resultsContainer && 
                !productSearchInput.contains(e.target) && 
                !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
    }

    loadBlogs();
}

// ============================================================================
// PRODUCT SEARCH & SELECTION
// ============================================================================

let searchTimeout = null;

async function searchProducts(query) {
    if (!query || query.trim().length < 2) {
        document.getElementById('blog-product-results').classList.add('hidden');
        return;
    }
    
    try {
        const snapshot = await get(productsRef);
        if (!snapshot.exists()) {
            document.getElementById('blog-product-results').innerHTML = '<p class="p-4 text-sm text-slate-500">Không tìm thấy sản phẩm</p>';
            return;
        }
        
        const products = snapshot.val();
        const searchLower = query.toLowerCase();
        
        const results = Object.entries(products)
            .map(([id, product]) => ({ id, ...product }))
            .filter(p => 
                p.name?.toLowerCase().includes(searchLower) ||
                p.brand?.toLowerCase().includes(searchLower) ||
                p.category?.toLowerCase().includes(searchLower)
            )
            .filter(p => !selectedProducts.find(sp => sp.id === p.id)) // Exclude already selected
            .slice(0, 5);
        
        renderProductResults(results);
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

function renderProductResults(results) {
    const container = document.getElementById('blog-product-results');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<p class="p-4 text-sm text-slate-500 text-center">Không tìm thấy sản phẩm nào</p>';
        container.classList.remove('hidden');
        return;
    }
    
    container.innerHTML = `
        <div class="p-2 border-b border-amber-200 dark:border-slate-600 bg-amber-100 dark:bg-slate-700">
            <p class="text-xs font-bold text-amber-700 dark:text-amber-400">Tìm thấy ${results.length} sản phẩm</p>
        </div>
        ${results.map(product => `
            <div class="p-3 hover:bg-amber-100 dark:hover:bg-slate-700 cursor-pointer border-b border-amber-100 dark:border-slate-600 last:border-0 flex items-center gap-3 transition-colors" 
                 onclick="window.blogModule.addProduct('${product.id}', '${escapeHtml(product.name)}', '${product.images?.[0] || ''}', ${product.price})">
                <img src="${product.images?.[0] || 'image/coming_soon.png'}" 
                     class="w-12 h-12 object-cover rounded-lg bg-slate-100 border border-amber-200 dark:border-slate-600" 
                     onerror="this.src='image/coming_soon.png'">
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-slate-800 dark:text-white truncate" title="${product.name}">${product.name}</p>
                    <p class="text-xs text-slate-500">${product.brand || 'N/A'} • ${product.category || 'Sneakers'}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-xs font-bold text-amber-600 dark:text-amber-400">${formatPrice(product.price)}₫</p>
                        <span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                            ID: ${product.id}
                        </span>
                    </div>
                </div>
                <span class="material-symbols-rounded text-amber-500 text-[20px]">add_circle</span>
            </div>
        `).join('')}
    `;
    
    container.classList.remove('hidden');
}

function addProduct(id, name, image, price) {
    // Check limit
    if (selectedProducts.length >= 3) {
        // Show toast notification
        showToast('Chỉ có thể chọn tối đa 3 sản phẩm!', 'warning');
        return;
    }
    
    // Check duplicate
    if (selectedProducts.find(p => p.id === id)) {
        showToast('Sản phẩm đã được chọn!', 'info');
        return;
    }
    
    selectedProducts.push({ id, name, image, price });
    renderSelectedProducts();
    
    // Clear search
    const searchInput = document.getElementById('blog-product-search');
    if (searchInput) searchInput.value = '';
    document.getElementById('blog-product-results').classList.add('hidden');
    
    // Show success toast
    showToast(`Đã thêm "${name}" vào danh sách sản phẩm`, 'success');
}

// Simple toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transform translate-x-full transition-transform duration-300 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'warning' ? 'bg-yellow-600' : 
        type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function removeProduct(id) {
    const product = selectedProducts.find(p => p.id === id);
    selectedProducts = selectedProducts.filter(p => p.id !== id);
    renderSelectedProducts();
    
    if (product) {
        showToast(`Đã xóa "${product.name}" khỏi danh sách`, 'info');
    }
}

function renderSelectedProducts() {
    const container = document.getElementById('blog-selected-products');
    const countElement = document.getElementById('selected-count');
    
    if (!container) return;
    
    // Update count
    if (countElement) {
        countElement.textContent = selectedProducts.length;
    }
    
    if (selectedProducts.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic py-2">Chưa chọn sản phẩm nào</p>';
        return;
    }
    
    container.innerHTML = selectedProducts.map(product => `
        <div class="flex items-center gap-3 p-3 bg-amber-50 dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-600 transition-all hover:shadow-md">
            <img src="${product.image || 'image/coming_soon.png'}" 
                 class="w-12 h-12 object-cover rounded-lg border border-amber-200 dark:border-slate-600" 
                 onerror="this.src='image/coming_soon.png'">
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm text-slate-800 dark:text-white truncate" title="${product.name}">${product.name}</p>
                <p class="text-xs text-slate-500">${formatPrice(product.price)}₫</p>
                <p class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">ID: ${product.id}</p>
            </div>
            <button type="button" onclick="window.blogModule.removeProduct('${product.id}')" 
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all" 
                    title="Xóa sản phẩm">
                <span class="material-symbols-rounded text-[16px]">close</span>
            </button>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

window.blogModule = {
    init,
    reload,
    openModal,
    closeModal,
    openEditModal,
    saveBlog,
    deleteBlog,
    addProduct,
    removeProduct
};

// Don't auto-init, wait for tab to be active
console.log('Blog Module Loaded (waiting for init)');
