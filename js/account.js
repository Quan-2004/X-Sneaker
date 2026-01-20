// Account Page Logic for X-Sneaker
// Handles user profile display, editing, and real-time updates

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    updateProfile as updateAuthProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue,
    update,
    get,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initCloudinaryWidget } from './cloudinary-upload.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBk41iuorgnQF0rbCr-BmlVAfMgVeIRVU8",
    authDomain: "x-sneaker.firebaseapp.com",
    databaseURL: "https://x-sneaker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "x-sneaker",
    storageBucket: "x-sneaker.firebasestorage.app",
    messagingSenderId: "577198860451",
    appId: "1:577198860451:web:3cf88ce9496c70e3847716",
    measurementId: "G-D43H8ELM22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Global State
let currentUser = null;
let cloudinaryWidget = null;
let unsubscribeProfile = null;
let unsubscribeOrders = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Account page initializing...');
    initAccountPage();
});

function initAccountPage() {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            currentUser = user;
            loadUserProfile(user.uid);
            loadUserOrders(user.uid);
            loadUserWishlist(user.uid);
            loadUserProfile(user.uid);
            loadUserOrders(user.uid);
            loadUserWishlist(user.uid);
            setupEventListeners();
            setupTabNavigation(); // Setup tabs
        } else {
            console.log('User not authenticated, redirecting...');
            window.location.href = 'login.html';
        }
    });
}

// ============================================================================
// DATA FETCHING & REAL-TIME LISTENERS
// ============================================================================

function loadUserProfile(uid) {
    const userRef = ref(database, `users/${uid}`);
    
    // Real-time listener
    unsubscribeProfile = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('User data loaded:', userData);
            renderUserProfile(userData);
        } else {
            console.warn('User data not found in database');
            // Create basic profile from auth data
            createBasicProfile(uid);
        }
    }, (error) => {
        console.error('Error loading profile:', error);
        showToast('Không thể tải thông tin người dùng!', 'error');
    });
}

async function createBasicProfile(uid) {
    const user = auth.currentUser;
    if (!user) return;

    const basicData = {
        uid: uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || '../image/default-avatar.jpg',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        role: 'customer',
        loyaltyPoints: 0,
        membershipTier: 'Member'
    };

    try {
        await update(ref(database, `users/${uid}`), basicData);
        console.log('Basic profile created');
    } catch (error) {
        console.error('Error creating profile:', error);
    }
}

function loadUserOrders(uid) {
    const ordersRef = ref(database, 'orders');
    // Create a query to filter orders by userId
    const ordersQuery = query(ordersRef, orderByChild('userId'), equalTo(uid));
    
    unsubscribeOrders = onValue(ordersQuery, (snapshot) => {
        if (snapshot.exists()) {
            const allOrders = snapshot.val();
            // Convert to array and sort
            const userOrders = Object.values(allOrders)
                .sort((a, b) => b.createdAt - a.createdAt);
            
            console.log('User orders loaded:', userOrders.length);
            renderOrderHistory(userOrders);
            updateOrderStats(userOrders);
        } else {
            renderOrderHistory([]);
            updateOrderStats([]);
        }
    }, (error) => {
        console.error('Error loading orders:', error);
        // Don't show toast for permission error on load, just log it
    });
}

async function loadUserWishlist(uid) {
    try {
        const wishlistRef = ref(database, `wishlist/${uid}`);
        const snapshot = await get(wishlistRef);
        
        if (snapshot.exists()) {
            const wishlistData = snapshot.val();
            const productIds = Object.keys(wishlistData); // Assuming wishlist structure is { productId: true/timestamp }
            
            document.getElementById('wishlist-count').textContent = productIds.length;
            
            // Fetch product details for wishlist tab
            if (productIds.length > 0) {
                const products = await Promise.all(productIds.map(async (pid) => {
                    const productSnapshot = await get(ref(database, `products/${pid}`));
                    if (productSnapshot.exists()) {
                        return { id: pid, ...productSnapshot.val() };
                    }
                    return null;
                }));
                const validProducts = products.filter(p => p !== null);
                renderWishlist(validProducts);
            } else {
                renderWishlist([]);
            }
        } else {
            document.getElementById('wishlist-count').textContent = '0';
            renderWishlist([]);
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
        document.getElementById('wishlist-count').textContent = '0';
        renderWishlist([]);
    }
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderUserProfile(userData) {
    // Sidebar Avatar & Name
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const tierEl = document.getElementById('user-tier');
    const welcomeEl = document.getElementById('welcome-message');

    if (avatarEl) {
        avatarEl.style.backgroundImage = `url('${userData.photoURL || '../image/default-avatar.jpg'}')`;
    }
    
    if (nameEl) {
        nameEl.textContent = userData.displayName || 'User';
    }
    
    if (tierEl) {
        tierEl.textContent = userData.membershipTier || 'Member';
    }

    if (welcomeEl) {
        const firstName = (userData.displayName || 'bạn').split(' ')[0];
        welcomeEl.textContent = `Chào mừng trở lại, ${firstName}!`;
    }

    // Loyalty Points
    const pointsEl = document.getElementById('loyalty-points');
    if (pointsEl) {
        pointsEl.textContent = (userData.loyaltyPoints || 0).toLocaleString();
    }

    // Populate Detailed Info Card
    const infoName = document.getElementById('info-displayname');
    const infoEmail = document.getElementById('info-email');
    const infoPhone = document.getElementById('info-phone');
    const infoGender = document.getElementById('info-gender');
    const infoAddress = document.getElementById('info-address');

    if (infoName) infoName.textContent = userData.displayName || 'Chưa cập nhật';
    if (infoEmail) infoEmail.textContent = userData.email || 'Chưa cập nhật';
    
    if (infoPhone) {
        infoPhone.textContent = userData.phone || 'Chưa cập nhật';
        infoPhone.className = userData.phone ? 'font-medium text-lg' : 'font-medium text-lg text-gray-400 italic';
    }
    
    if (infoGender) {
        const genders = { 'male': 'Nam', 'female': 'Nữ', 'other': 'Khác' };
        infoGender.textContent = genders[userData.gender] || 'Chưa cập nhật';
        infoGender.className = userData.gender ? 'font-medium text-lg' : 'font-medium text-lg text-gray-400 italic';
    }

    if (infoAddress) {
        const addr = userData.address;
        if (addr && (addr.street || addr.ward || addr.district || addr.city)) {
            infoAddress.textContent = [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ');
            infoAddress.className = 'font-medium text-lg';
        } else {
            infoAddress.textContent = 'Chưa cập nhật địa chỉ';
            infoAddress.className = 'font-medium text-lg text-gray-400 italic';
        }
    }
}

function renderOrderHistory(orders) {
    // Render to both summary table (Dashboard) and full table (Orders Tab)
    const summaryTbody = document.getElementById('orders-table-body');
    const fullTbody = document.getElementById('full-orders-table-body');
    
    const renderTable = (tbody, isSummary) => {
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_bag</span>
                        <p class="text-gray-500 font-medium">Chưa có đơn hàng nào</p>
                        <a href="Product.html" class="text-primary hover:underline text-sm mt-2 inline-block">Mua sắm ngay</a>
                    </td>
                </tr>
            `;
            return;
        }

        const ordersToRender = isSummary ? orders.slice(0, 5) : orders;

        tbody.innerHTML = ordersToRender.map(order => `
            <tr class="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                <td class="px-6 py-5 font-bold text-sm">${order.orderId || 'N/A'}</td>
                <td class="px-6 py-5 text-sm text-gray-500">${formatDate(order.createdAt)}</td>
                <td class="px-6 py-5">
                    <div class="flex -space-x-2">
                        ${order.items ? order.items.slice(0, 3).map(item => `
                            <div class="size-8 rounded-full border-2 border-white dark:border-background-dark bg-cover bg-center" 
                                 style="background-image: url('${item.image || '../image/product-1.jpg'}')"></div>
                        `).join('') : ''}
                        ${order.items && order.items.length > 3 ? `
                            <div class="size-8 rounded-full border-2 border-white dark:border-background-dark bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                                +${order.items.length - 3}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="px-6 py-5">
                    ${getStatusBadge(order.status)}
                </td>
                <td class="px-6 py-5 font-bold text-sm">${formatPrice(order.total)}</td>
                <td class="px-6 py-5 text-right">
                    <button class="bg-primary text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                        Chi Tiết
                    </button>
                </td>
            </tr>
        `).join('');
    };

    renderTable(summaryTbody, true);
    renderTable(fullTbody, false);
}

function renderWishlist(products) {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-gray-700">
                <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">favorite_border</span>
                <p class="text-gray-500 font-medium">Danh sách yêu thích trống</p>
                <a href="Product.html" class="text-primary font-bold hover:underline mt-2 inline-block">Khám phá sản phẩm</a>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
                <img src="${product.image || '../image/product-1.jpg'}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <button onclick="addToCart('${product.id}')" class="absolute bottom-3 right-3 bg-white text-black p-2 rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-xl">shopping_cart</span>
                </button>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-sm line-clamp-1 mb-1">${product.name}</h3>
                <p class="text-primary font-black">${formatPrice(product.price)}</p>
            </div>
        </div>
    `).join('');
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update Active State
            tabs.forEach(t => t.classList.remove('active', 'bg-primary', 'text-white'));
            tabs.forEach(t => {
                if (!t.classList.contains('active')) {
                    t.classList.add('text-gray-600', 'hover:bg-gray-100');
                    // Remove old active classes just in case
                    t.classList.remove('bg-primary', 'text-white');
                }
            });
            
            // Set styles for active tab
            tab.classList.add('active', 'bg-primary', 'text-white');
            tab.classList.remove('text-gray-600', 'hover:bg-gray-100');

            // Show Content
            contents.forEach(content => {
                if (content.id === `tab-${targetId}`) {
                    content.classList.remove('hidden');
                    // Simple animation
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        content.style.transition = 'all 0.3s ease-out';
                        content.style.opacity = '1';
                        content.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

function updateOrderStats(orders) {
    const totalOrdersEl = document.getElementById('total-orders');
    if (totalOrdersEl) {
        totalOrdersEl.textContent = orders.length;
    }
}

// ============================================================================
// PROFILE EDITING
// ============================================================================

function setupEventListeners() {
    // Edit Profile Button
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditModal);
    }

    // Close Modal Buttons
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);

    // Avatar Upload Button
    const uploadBtn = document.getElementById('upload-avatar-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openAvatarUpload);
    }

    // Form Submit
    const form = document.getElementById('edit-profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openLogoutModal();
        });
    }

    // Modal Action Buttons (Logout)
    document.getElementById('btn-cancel-logout')?.addEventListener('click', closeLogoutModal);
    document.getElementById('btn-confirm-logout')?.addEventListener('click', handleLogout);

    // Delete Account Button
    document.getElementById('btn-request-delete')?.addEventListener('click', openDeleteModal);
    
    // Modal Action Buttons (Delete)
    document.getElementById('btn-cancel-delete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('btn-confirm-delete')?.addEventListener('click', handleDeleteAccount);
}

// ============================================================================
// MODAL LOGIC (LOGOUT & DELETE)
// ============================================================================

function openLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('hidden', 'opacity-0');
        modal.classList.add('flex', 'opacity-100');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('flex', 'opacity-100');
        modal.classList.add('hidden', 'opacity-0');
    }
}

function openDeleteModal() {
    const modal = document.getElementById('delete-account-modal');
    if (modal) {
        modal.classList.remove('hidden', 'opacity-0');
        modal.classList.add('flex', 'opacity-100');
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-account-modal');
    if (modal) {
        modal.classList.remove('flex', 'opacity-100');
        modal.classList.add('hidden', 'opacity-0');
    }
}

async function handleDeleteAccount() {
    const confirmBtn = document.getElementById('btn-confirm-delete');
    const originalText = confirmBtn.textContent;

    try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...';

        // 1. Mark account as scheduled for deletion in Database
        // This is a "Soft Delete" - Admin or Cloud Function would clean this up after 7 days
        await update(ref(database, `users/${currentUser.uid}`), {
            deletionScheduled: true,
            deletionRequestedAt: Date.now(),
            accountStatus: 'pending_deletion'
        });

        showToast('Yêu cầu xóa tài khoản đã được ghi nhận. Bạn sẽ được đăng xuất.');
        
        // 2. Sign out
        setTimeout(async () => {
            await handleLogout();
        }, 2000);

    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Có lỗi xảy ra! Vui lòng thử lại.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

async function openEditModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    try {
        // Fetch current data
        const snapshot = await get(ref(database, `users/${currentUser.uid}`));
        const userData = snapshot.val() || {};

        // Populate form
        document.getElementById('edit-displayName').value = userData.displayName || '';
        document.getElementById('edit-email').value = userData.email || '';
        document.getElementById('edit-gender').value = userData.gender || '';
        document.getElementById('edit-phone').value = userData.phone || '';
        document.getElementById('edit-street').value = userData.address?.street || '';
        document.getElementById('edit-ward').value = userData.address?.ward || '';
        document.getElementById('edit-district').value = userData.address?.district || '';
        document.getElementById('edit-city').value = userData.address?.city || '';
        document.getElementById('avatar-url').value = userData.photoURL || '';

        // Preview avatar
        const previewAvatar = document.getElementById('preview-avatar');
        if (previewAvatar) {
            previewAvatar.style.backgroundImage = `url('${userData.photoURL || '../image/default-avatar.jpg'}')`;
        }

        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('Error opening edit modal:', error);
        showToast('Không thể mở form chỉnh sửa!', 'error');
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function openAvatarUpload() {
    if (!cloudinaryWidget) {
        cloudinaryWidget = initCloudinaryWidget((url) => {
            console.log('Avatar uploaded:', url);
            document.getElementById('avatar-url').value = url;
            document.getElementById('preview-avatar').style.backgroundImage = `url('${url}')`;
            showToast('Avatar đã được upload thành công!');
        });
    }

    if (cloudinaryWidget) {
        cloudinaryWidget.open();
    } else {
        showToast('Không thể mở upload widget. Vui lòng thử lại!', 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang lưu...';

        const formData = new FormData(e.target);
        const updates = {
            displayName: formData.get('displayName'),
            gender: formData.get('gender'),
            phone: formData.get('phone'),
            photoURL: formData.get('photoURL'),
            address: {
                street: formData.get('address.street'),
                ward: formData.get('address.ward'),
                district: formData.get('address.district'),
                city: formData.get('address.city')
            }
        };

        // Update Realtime Database
        await update(ref(database, `users/${currentUser.uid}`), updates);

        // Update Auth Profile (displayName & photoURL)
        await updateAuthProfile(currentUser, {
            displayName: updates.displayName,
            photoURL: updates.photoURL
        });

        showToast('Cập nhật thông tin thành công!');
        closeEditModal();

    } catch (error) {
        console.error('Update error:', error);
        showToast('Cập nhật thất bại! Vui lòng thử lại.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function handleLogout() {
    try {
        const { logoutUser } = await import('./auth.js');
        await logoutUser();
    } catch (error) {
        console.error('Logout error:', error);
        // Fallback logout
        await auth.signOut();
        window.location.href = 'index.html';
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatPrice(price) {
    if (!price) return '0₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function getStatusBadge(status) {
    const statusConfig = {
        'processing': {
            text: 'Đang xử lý',
            class: 'bg-primary/10 text-primary'
        },
        'shipping': {
            text: 'Đang gửi',
            class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        },
        'delivered': {
            text: 'Đã giao',
            class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        },
        'cancelled': {
            text: 'Đã hủy',
            class: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
        }
    };

    const config = statusConfig[status] || statusConfig['processing'];
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${config.class}">${config.text}</span>`;
}

function showToast(message, type = 'success') {
    if (window.showToast) {
        window.showToast(message);
    } else {
        alert(message);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeOrders) unsubscribeOrders();
});

console.log('✅ Account page module loaded');
