import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const blogsRef = ref(db, 'blogs');

let currentBlogs = {};
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

    // Sort by date desc
    const sortedBlogs = Object.entries(blogs).sort((a, b) => {
        return new Date(b[1].createdAt) - new Date(a[1].createdAt);
    });

    sortedBlogs.forEach(([id, blog]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const imgUrl = blog.image ? getOptimizedImageUrl(blog.image, { width: 80, height: 60, crop: 'cover' }) : 'https://placehold.co/80x60';
        const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('vi-VN') : 'N/A';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="w-16 h-12 bg-slate-100 dark:bg-white/5 rounded-lg overflow-hidden border border-slate-200 dark:border-border-dark">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px]">${blog.title}</p>
                <p class="text-xs text-slate-500 line-clamp-1 max-w-[200px] mt-0.5">${blog.summary || ''}</p>
            </td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm font-medium">${blog.author || 'Admin'}</td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">${dateStr}</td>
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
    
    // Auth Check (Optional here if core handles it, but good safety)
    const auth = getFirebaseAuth();
    
    isInitialized = true;
}

// 3. Modal Handling
function openModal() {
    const modal = document.getElementById('blog-modal');
    if (!modal) return;
    
    // Reset Form
    document.getElementById('blog-form').reset();
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-image-url').value = '';
    document.getElementById('blog-image-preview').innerHTML = '<span class="material-symbols-rounded text-slate-400 text-4xl">image</span><p class="text-xs text-slate-400 mt-2">Click to upload</p>';
    document.getElementById('blog-modal-title').innerText = 'Create New Post';

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

function openEditModal(id) {
    const blog = currentBlogs[id];
    if (!blog) return;

    document.getElementById('blog-id').value = id;
    document.getElementById('blog-title').value = blog.title || '';
    document.getElementById('blog-author').value = blog.author || '';
    document.getElementById('blog-category').value = blog.category || '';
    document.getElementById('blog-summary').value = blog.summary || '';
    document.getElementById('blog-content').value = blog.content || '';
    document.getElementById('blog-image-url').value = blog.image || '';

    const previewDiv = document.getElementById('blog-image-preview');
    if (blog.image) {
        previewDiv.innerHTML = `<img src="${blog.image}" class="w-full h-full object-cover rounded-lg">`;
    } else {
        previewDiv.innerHTML = '<span class="material-symbols-rounded text-slate-400 text-4xl">image</span>';
    }

    document.getElementById('blog-modal-title').innerText = 'Edit Post';
    openModal();
    // Don't reset form since we just filled it, openModal usually resets. 
    // Fix: Separate reset logic or remove reset from openModal.
    // Let's modify openModal to NOT reset if we are just showing it? 
    // Actually, distinct functions:
    const modal = document.getElementById('blog-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// 4. Form Submission
async function saveBlog(e) {
    if (e) e.preventDefault();
    
    const form = document.getElementById('blog-form');
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-sm">rotate_right</span> Saving...';
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('blog-id').value;
        const fileInput = document.getElementById('blog-image-file');
        const file = fileInput.files[0];
        let imageUrl = document.getElementById('blog-image-url').value;

        // Upload image
        if (file) {
            imageUrl = await uploadAvatarDirect(file);
        }

        const blogData = {
            title: document.getElementById('blog-title').value,
            author: document.getElementById('blog-author').value,
            category: document.getElementById('blog-category').value,
            summary: document.getElementById('blog-summary').value,
            content: document.getElementById('blog-content').value,
            image: imageUrl,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            await set(ref(db, `blogs/${id}`), blogData);
        } else {
            blogData.createdAt = new Date().toISOString();
            await push(blogsRef, blogData);
        }

        closeModal();
        alert('Post saved successfully!');
        
    } catch (error) {
        console.error('Error saving blog:', error);
        alert('Failed to save post: ' + error.message);
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
    
    // Bind Events locally if needed (e.g. form submit)
    const form = document.getElementById('blog-form');
    if (form) {
        // Remove old listeners to avoid duplicates? 
        // It's better to use onclick in HTML for simple stuff or bind once.
        // For form submit, we can use onsubmit="window.blogModule.saveBlog(event)"
    }
    
    const fileInput = document.getElementById('blog-image-file');
    if (fileInput) {
        fileInput.onchange = handleImagePreview;
    }

    loadBlogs();
}

window.blogModule = {
    init,
    reload,
    openModal,
    closeModal,
    openEditModal,
    saveBlog,
    deleteBlog
};

init();
console.log('Blog Module Loaded');
