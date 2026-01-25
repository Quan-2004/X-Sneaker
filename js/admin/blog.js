import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';

const db = getFirebaseDatabase();
const blogsRef = ref(db, 'blogs');

// DOM Elements
const tableBody = document.getElementById('blog-table-body');
const modal = document.getElementById('blog-modal');
const form = document.getElementById('blog-form');
const btnAdd = document.getElementById('btn-add-blog');
const btnClose = document.getElementById('btn-close-blog-modal');
const btnCancel = document.getElementById('btn-cancel-blog');
const fileInput = document.getElementById('blog-image-file');
const previewDiv = document.getElementById('blog-image-preview');

let currentBlogs = {};

// 1. Render Table
function renderTable(blogs) {
    tableBody.innerHTML = '';
    
    if (!blogs) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No posts found.</td></tr>';
        return;
    }

    Object.entries(blogs).forEach(([id, blog]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const imgUrl = blog.image ? getOptimizedImageUrl(blog.image, { width: 60, height: 40 }) : 'https://placehold.co/60x40';
        const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'N/A';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="w-16 h-10 bg-slate-100 dark:bg-white/5 rounded overflow-hidden">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                </div>
            </td>
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px] block">${blog.title}</td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${blog.author || 'X-Sneaker'}</td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">${dateStr}</td>
            <td class="px-6 py-4 text-right">
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-edit-blog" data-id="${id}">
                    <span class="material-symbols-outlined text-[20px]">edit_note</span>
                </button>
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-delete-blog" data-id="${id}">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add Listeners
    document.querySelectorAll('.btn-edit-blog').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete-blog').forEach(btn => {
        btn.addEventListener('click', () => deleteBlog(btn.dataset.id));
    });
}

// 2. Data Fetching
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ...

function initBlogs() {
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
             onValue(blogsRef, (snapshot) => {
                currentBlogs = snapshot.val();
                renderTable(currentBlogs);
            }, (error) => {
                console.error(error);
            });
        }
    });
}

// 3. Modal Handling
function openModal() {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    form.reset();
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-image-url').value = '';
    previewDiv.innerHTML = '<span class="material-symbols-outlined text-gray-400">image</span>';
    document.getElementById('blog-modal-title').innerText = 'Create New Post';
}

function openEditModal(id) {
    const blog = currentBlogs[id];
    if (!blog) return;

    document.getElementById('blog-id').value = id;
    document.getElementById('blog-title').value = blog.title;
    document.getElementById('blog-author').value = blog.author || '';
    document.getElementById('blog-category').value = blog.category || '';
    document.getElementById('blog-summary').value = blog.summary || '';
    document.getElementById('blog-content').value = blog.content || '';
    document.getElementById('blog-image-url').value = blog.image || '';

    if (blog.image) {
        previewDiv.innerHTML = `<img src="${blog.image}" class="w-full h-full object-cover">`;
    }

    document.getElementById('blog-modal-title').innerText = 'Edit Post';
    openModal();
}

// 4. Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">rotate_right</span> Publishing...';
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('blog-id').value;
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
            // Update
            await set(ref(db, `blogs/${id}`), blogData);
        } else {
            // Create
            blogData.createdAt = new Date().toISOString();
            await push(blogsRef, blogData);
        }

        closeModal();
        
    } catch (error) {
        console.error('Error saving blog:', error);
        alert('Failed to save post: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Delete
async function deleteBlog(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            await remove(ref(db, `blogs/${id}`));
        } catch (error) {
            console.error(error);
            alert('Failed to delete post');
        }
    }
}

// Event Listeners
btnAdd.addEventListener('click', openModal);
btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewDiv.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover opacity-50">`;
        };
        reader.readAsDataURL(file);
    }
});

// Initialize
initBlogs();
console.log('Blog Module Loaded');
