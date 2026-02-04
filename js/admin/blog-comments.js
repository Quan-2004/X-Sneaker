/**
 * X-Sneaker Admin - Blog Comments Management Module
 * Manages blog comments moderation and approval
 */

import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, get, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';

const database = getFirebaseDatabase();

// Module state
const state = {
    comments: [],
    filteredComments: [],
    blogs: {},
    currentFilter: 'all',
    searchQuery: ''
};

/**
 * Initialize blog comments module
 */
export async function init() {
    console.log('Initializing Blog Comments Management Module...');
    
    setupRealtimeListeners();
    setupEventListeners();
    
    await Promise.all([
        fetchComments(),
        fetchBlogs()
    ]);
    
    updateStats();
    renderCommentsTable();
}

/**
 * Setup Firebase realtime listeners
 */
function setupRealtimeListeners() {
    const commentsRef = ref(database, 'blogComments');
    onValue(commentsRef, (snapshot) => {
        if (snapshot.exists()) {
            const commentsData = snapshot.val();
            const allComments = [];
            
            // Comments structure: blogComments/{blogId}/{commentId}
            Object.entries(commentsData).forEach(([blogId, blogComments]) => {
                Object.entries(blogComments).forEach(([commentId, comment]) => {
                    allComments.push({
                        id: commentId,
                        blogId,
                        ...comment,
                        status: comment.status || 'pending' // Default to pending if not set
                    });
                });
            });
            
            state.comments = allComments;
            applyFilters();
            updateStats();
            renderCommentsTable();
        } else {
            state.comments = [];
            state.filteredComments = [];
            updateStats();
            renderCommentsTable();
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-comments');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            applyFilters();
            renderCommentsTable();
        });
    }
}

/**
 * Fetch all comments from Firebase
 */
async function fetchComments() {
    try {
        const commentsRef = ref(database, 'blogComments');
        const snapshot = await get(commentsRef);
        
        if (snapshot.exists()) {
            const commentsData = snapshot.val();
            const allComments = [];
            
            Object.entries(commentsData).forEach(([blogId, blogComments]) => {
                Object.entries(blogComments).forEach(([commentId, comment]) => {
                    allComments.push({
                        id: commentId,
                        blogId,
                        ...comment,
                        status: comment.status || 'pending'
                    });
                });
            });
            
            state.comments = allComments;
            applyFilters();
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}

/**
 * Fetch blogs for displaying blog titles
 */
async function fetchBlogs() {
    try {
        const blogsRef = ref(database, 'blogs');
        const snapshot = await get(blogsRef);
        
        if (snapshot.exists()) {
            state.blogs = snapshot.val();
        }
    } catch (error) {
        console.error('Error fetching blogs:', error);
    }
}

/**
 * Apply filters and search
 */
function applyFilters() {
    let filtered = [...state.comments];
    
    // Filter by status
    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(comment => {
            if (state.currentFilter === 'pending') return !comment.status || comment.status === 'pending';
            if (state.currentFilter === 'approved') return comment.status === 'approved';
            if (state.currentFilter === 'hidden') return comment.status === 'hidden';
            return true;
        });
    }
    
    // Apply search
    if (state.searchQuery) {
        filtered = filtered.filter(comment => {
            const blogTitle = state.blogs[comment.blogId]?.title || '';
            return (
                comment.content.toLowerCase().includes(state.searchQuery) ||
                comment.userName.toLowerCase().includes(state.searchQuery) ||
                comment.userEmail.toLowerCase().includes(state.searchQuery) ||
                blogTitle.toLowerCase().includes(state.searchQuery)
            );
        });
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    state.filteredComments = filtered;
}

/**
 * Update statistics
 */
function updateStats() {
    const totalEl = document.getElementById('total-comments-count');
    const pendingEl = document.getElementById('pending-comments-count');
    const approvedEl = document.getElementById('approved-comments-count');
    const hiddenEl = document.getElementById('hidden-comments-count');
    
    if (totalEl) totalEl.textContent = state.comments.length;
    
    const pending = state.comments.filter(c => !c.status || c.status === 'pending').length;
    const approved = state.comments.filter(c => c.status === 'approved').length;
    const hidden = state.comments.filter(c => c.status === 'hidden').length;
    
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (hiddenEl) hiddenEl.textContent = hidden;
}

/**
 * Set filter
 */
export function setFilter(filter) {
    state.currentFilter = filter;
    applyFilters();
    renderCommentsTable();
    
    // Update button states
    document.querySelectorAll('[id^="filter-btn-"]').forEach(btn => {
        btn.classList.remove('bg-white', 'text-slate-900', 'shadow-sm', 'font-bold');
        btn.classList.add('text-slate-600', 'hover:text-slate-900', 'font-medium');
    });
    
    const activeBtn = document.getElementById(`filter-btn-${filter}-comments`);
    if (activeBtn) {
        activeBtn.classList.add('bg-white', 'text-slate-900', 'shadow-sm', 'font-bold');
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'font-medium');
    }
}

/**
 * Render comments table
 */
function renderCommentsTable() {
    const tbody = document.getElementById('comments-table-body');
    if (!tbody) return;
    
    if (state.filteredComments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                    <span class="material-symbols-rounded text-6xl text-slate-300 mb-2">comment</span>
                    <p class="font-medium">${state.searchQuery ? 'Không tìm thấy bình luận' : 'Chưa có bình luận nào'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = state.filteredComments.map(comment => {
        const blog = state.blogs[comment.blogId] || {};
        const blogTitle = blog.title || 'Bài viết không tồn tại';
        const status = comment.status || 'pending';
        
        const statusBadge = {
            'pending': '<span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Chờ duyệt</span>',
            'approved': '<span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đã duyệt</span>',
            'hidden': '<span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Đã ẩn</span>'
        };
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="max-w-xs">
                        <p class="text-sm font-semibold text-slate-900 truncate">${blogTitle}</p>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                            ${comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-900">${comment.userName}</p>
                            <p class="text-xs text-slate-500">${comment.userEmail}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="max-w-md">
                        <p class="text-sm text-slate-700 line-clamp-2">${comment.content}</p>
                        ${comment.parentId ? '<span class="inline-flex items-center gap-1 text-xs text-blue-600 mt-1"><span class="material-symbols-rounded text-[14px]">subdirectory_arrow_right</span>Trả lời</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm text-slate-500">${formatDate(comment.timestamp)}</p>
                </td>
                <td class="px-6 py-4">
                    ${statusBadge[status]}
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="window.blogCommentsModule.viewComment('${comment.blogId}', '${comment.id}')" class="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết">
                            <span class="material-symbols-rounded text-[20px] text-blue-600">visibility</span>
                        </button>
                        ${status !== 'hidden' ? `
                            <button onclick="window.blogCommentsModule.hideComment('${comment.blogId}', '${comment.id}')" class="p-2 hover:bg-orange-50 rounded-lg transition-colors" title="Ẩn">
                                <span class="material-symbols-rounded text-[20px] text-orange-600">visibility_off</span>
                            </button>
                        ` : ''}
                        <button onclick="window.blogCommentsModule.deleteComment('${comment.blogId}', '${comment.id}')" class="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <span class="material-symbols-rounded text-[20px] text-red-600">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * View comment details
 */
export function viewComment(blogId, commentId) {
    const comment = state.comments.find(c => c.blogId === blogId && c.id === commentId);
    if (!comment) {
        showNotification('Không tìm thấy bình luận', 'error');
        return;
    }
    
    const blog = state.blogs[blogId] || {};
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900">Chi tiết bình luận</h3>
                    <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <span class="material-symbols-rounded text-gray-500">close</span>
                    </button>
                </div>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Bài viết</label>
                    <p class="text-gray-900">${blog.title || 'N/A'}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Người bình luận</label>
                        <p class="text-gray-900">${comment.userName || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p class="text-gray-900">${comment.userEmail || 'N/A'}</p>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                    <p class="text-gray-900 whitespace-pre-wrap">${comment.content || 'Không có nội dung'}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                        <p class="text-gray-900">${formatDate(comment.timestamp)}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                        <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                            comment.status === 'hidden' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }">
                            ${comment.status === 'approved' ? 'Đã duyệt' :
                              comment.status === 'hidden' ? 'Đã ẩn' :
                              'Chờ duyệt'}
                        </span>
                    </div>
                </div>
                
                ${comment.likes ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Lượt thích</label>
                        <p class="text-gray-900">${comment.likes}</p>
                    </div>
                ` : ''}
                
                ${comment.parentId ? `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p class="text-sm text-blue-900">Đây là bình luận trả lời cho một bình luận khác</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Đóng
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Approve comment
 */
export async function approveComment(blogId, commentId) {
    try {
        await update(ref(database, `blogComments/${blogId}/${commentId}`), {
            status: 'approved',
            moderatedAt: new Date().toISOString()
        });
        showNotification('Đã duyệt bình luận', 'success');
    } catch (error) {
        console.error('Error approving comment:', error);
        showNotification('Lỗi khi duyệt bình luận', 'error');
    }
}

/**
 * Hide comment
 */
export async function hideComment(blogId, commentId) {
    const confirmed = await window.showConfirm(
        'Bạn có chắc muốn ẩn bình luận này?',
        {
            title: 'Xác nhận ẩn',
            type: 'warning',
            confirmText: 'Ẩn',
            cancelText: 'Hủy'
        }
    );
    
    if (!confirmed) return;
    
    try {
        await update(ref(database, `blogComments/${blogId}/${commentId}`), {
            status: 'hidden',
            moderatedAt: new Date().toISOString()
        });
        showNotification('Đã ẩn bình luận', 'success');
    } catch (error) {
        console.error('Error hiding comment:', error);
        showNotification('Lỗi khi ẩn bình luận', 'error');
    }
}

/**
 * Delete comment
 */
export async function deleteComment(blogId, commentId) {
    const confirmed = await window.showConfirm(
        'Bạn có chắc muốn xóa bình luận này? Hành động này không thể hoàn tác.',
        {
            title: 'Xác nhận xóa',
            type: 'error',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        }
    );
    
    if (!confirmed) return;
    
    try {
        const commentRef = ref(database, `blogComments/${blogId}/${commentId}`);
        await remove(commentRef);
        showNotification('Đã xóa bình luận', 'success');
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification('Lỗi khi xóa bình luận', 'error');
    }
}

/**
 * Format date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Make module functions available globally
window.blogCommentsModule = {
    init,
    setFilter,
    viewComment,
    hideComment,
    deleteComment
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
