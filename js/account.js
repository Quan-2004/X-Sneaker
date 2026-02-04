// Account Page Logic for X-Sneaker
// Handles user profile display, editing, and real-time updates

import { getFirebaseAuth, getFirebaseDatabase } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile as updateAuthProfile
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { 
    ref, 
    onValue,
    update,
    get,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { initCloudinaryWidget } from './cloudinary-upload.js';

// Get Firebase instances from shared config
const auth = getFirebaseAuth();
const database = getFirebaseDatabase();

// Global State
let currentUser = null;
let cloudinaryWidget = null;
let unsubscribeProfile = null;
let unsubscribeOrders = null;
let allUserOrders = []; // Store all orders for quick access
let currentOrderFilter = 'all'; // Current filter status

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Account page initializing...');
    console.log('🔥 Firebase Auth:', auth);
    console.log('🔥 Firebase Database:', database);
    initAccountPage();
});

function initAccountPage() {
    // Check authentication state
    console.log('🔍 Initializing account page...');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('✅ User authenticated:', user.uid);
            currentUser = user;
            
            // Check if user has pending deletion request
            checkPendingDeletion(user.uid);
            
            loadUserProfile(user.uid);
            loadUserOrders(user.uid);
            loadUserWishlist(user.uid);
            setupEventListeners();
            setupTabNavigation(); // Setup tabs
            checkUrlForTab(); // Check URL for tab param
        } else {
            console.log('❌ User not authenticated, redirecting...');
            window.location.href = 'login.html';
        }
    });
}

function checkUrlForTab() {
    const params = new URLSearchParams(window.location.search);
    const tabName = params.get('tab');
    if (tabName) {
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
}

// ============================================================================
// DATA FETCHING & REAL-TIME LISTENERS
// ============================================================================

function loadUserProfile(uid) {
    console.log('📥 Loading user profile for:', uid);
    const userRef = ref(database, `users/${uid}`);
    
    // Real-time listener
    unsubscribeProfile = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('✅ User data loaded:', userData);
            renderUserProfile(userData);
        } else {
            console.warn('⚠️ User data not found in database');
            // Create basic profile from auth data
            createBasicProfile(uid);
        }
    }, (error) => {
        console.error('❌ Error loading profile:', error);
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

async function loadUserOrders(uid) {
    try {
        // Query orders by userId using Firebase query
        const ordersRef = ref(database, 'orders');
        const userOrdersQuery = query(ordersRef, orderByChild('userId'), equalTo(uid));
        
        const snapshot = await get(userOrdersQuery);
        
        if (snapshot.exists()) {
            const ordersData = snapshot.val();
            // Convert to array and sort by createdAt
            const userOrders = Object.entries(ordersData)
                .map(([id, order]) => ({ ...order, id }))
                .sort((a, b) => b.createdAt - a.createdAt);
            
            // Store orders globally for modal access
            allUserOrders = userOrders;
            
            console.log('User orders loaded:', userOrders.length);
            renderOrderHistory(userOrders);
            updateOrderStats(userOrders);
        } else {
            console.log('No orders found for user');
            allUserOrders = [];
            renderOrderHistory([]);
            updateOrderStats([]);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        // If permission denied or error, show empty state
        allUserOrders = [];
        renderOrderHistory([]);
        updateOrderStats([]);
    }
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

    // Check if user is admin and show admin panel button
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn && (userData.role === 'admin' || userData.isAdmin === true)) {
        adminBtn.classList.remove('hidden');
        adminBtn.classList.add('flex');
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
    console.log('🎨 Rendering orders with filter:', currentOrderFilter);
    console.log('📊 Total orders before filter:', orders.length);
    
    // Apply current filter
    let filteredOrders = orders;
    if (currentOrderFilter !== 'all') {
        if (currentOrderFilter === 'pending') {
            // "Chờ xử lý" bao gồm cả pending và processing (legacy)
            filteredOrders = orders.filter(order => order.status === 'pending' || order.status === 'processing');
        } else {
            filteredOrders = orders.filter(order => order.status === currentOrderFilter);
        }
        console.log(`✅ Filtered orders (${currentOrderFilter}):`, filteredOrders.length);
    }
    
    // Render to both summary table (Dashboard) and full table (Orders Tab)
    const summaryTbody = document.getElementById('orders-table-body');
    const fullTbody = document.getElementById('full-orders-table-body');
    
    const renderTable = (tbody, isSummary) => {
        if (!tbody) return;

        if (filteredOrders.length === 0) {
            const emptyMessage = currentOrderFilter === 'all' 
                ? 'Chưa có đơn hàng nào'
                : `Không có đơn hàng ${getFilterLabel(currentOrderFilter)}`;
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_bag</span>
                        <p class="text-gray-500 font-medium">${emptyMessage}</p>
                        ${currentOrderFilter === 'all' ? '<a href="Product.html" class="text-primary hover:underline text-sm mt-2 inline-block">Mua sắm ngay</a>' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        const ordersToRender = isSummary ? filteredOrders.slice(0, 5) : filteredOrders;

        tbody.innerHTML = ordersToRender.map(order => `
            <tr class="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                <td class="px-6 py-5 font-bold text-sm">${order.orderId || 'N/A'}</td>
                <td class="px-6 py-5 text-sm text-gray-500">${formatDate(order.createdAt)}</td>
                <td class="px-6 py-5">
                    <div class="flex -space-x-2">
                        ${order.items ? order.items.slice(0, 3).map(item => `
                            <div class="size-8 rounded-full border-2 border-white dark:border-background-dark bg-cover bg-center" 
                                 style="background-image: url('${item.image || '../image/coming_soon.png'}')"></div>
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
                    <button onclick="showOrderDetails('${order.id}')" class="bg-primary text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
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
            <a href="Product-detail.html?id=${product.id}" class="block">
                <div class="aspect-square bg-gray-100 relative overflow-hidden">
                    <img src="${product.image || product.images?.[0] || 'image/coming_soon.png'}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <button onclick="event.preventDefault(); event.stopPropagation(); addToCart('${product.id}')" class="absolute bottom-3 right-3 bg-white text-black p-2 rounded-full shadow-lg hover:bg-primary hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-xl">shopping_cart</span>
                    </button>
                </div>
            </a>
            <div class="p-4">
                <a href="Product-detail.html?id=${product.id}" class="block">
                    <h3 class="font-bold text-sm line-clamp-1 mb-1 hover:text-primary transition-colors">${product.name}</h3>
                </a>
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
    
    // Pending Deletion Modal Buttons
    document.getElementById('btn-cancel-pending-deletion')?.addEventListener('click', handleCancelDeletion);
    document.getElementById('btn-proceed-deletion')?.addEventListener('click', closePendingDeletionModal);
    document.getElementById('close-pending-deletion-btn')?.addEventListener('click', closePendingDeletionModal);
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
// PENDING DELETION MANAGEMENT
// ============================================================================

async function checkPendingDeletion(uid) {
    try {
        const userRef = ref(database, `users/${uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Check if account is scheduled for deletion
            if (userData.deletionScheduled === true && userData.deletionRequestedAt) {
                const requestDate = userData.deletionRequestedAt;
                const currentTime = Date.now();
                const daysPassed = Math.floor((currentTime - requestDate) / (1000 * 60 * 60 * 24));
                const daysRemaining = 7 - daysPassed;
                
                console.log('Pending deletion detected:', {
                    requestDate: new Date(requestDate),
                    daysPassed,
                    daysRemaining
                });
                
                // If grace period expired, force logout
                if (daysRemaining <= 0) {
                    showToast('Tài khoản đã hết thời gian gia hạn và sẽ bị xóa vĩnh viễn.', 'error');
                    setTimeout(() => {
                        handleLogout();
                    }, 3000);
                    return;
                }
                
                // Show pending deletion notification
                showPendingDeletionModal(requestDate, daysRemaining);
            }
        }
    } catch (error) {
        console.error('Error checking pending deletion:', error);
    }
}

function showPendingDeletionModal(requestDate, daysRemaining) {
    const modal = document.getElementById('pending-deletion-modal');
    if (!modal) return;
    
    // Format request date
    const dateEl = document.getElementById('deletion-request-date');
    if (dateEl) {
        dateEl.textContent = new Date(requestDate).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // Display days remaining
    const daysEl = document.getElementById('days-remaining');
    if (daysEl) {
        daysEl.textContent = daysRemaining;
    }
    
    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        const content = modal.querySelector('.transform');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }, 10);
}

function closePendingDeletionModal() {
    const modal = document.getElementById('pending-deletion-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    const content = modal.querySelector('.transform');
    if (content) {
        content.classList.add('scale-95');
        content.classList.remove('scale-100');
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

async function handleCancelDeletion() {
    const cancelBtn = document.getElementById('btn-cancel-pending-deletion');
    const originalHTML = cancelBtn.innerHTML;
    
    try {
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...';
        
        // Remove deletion flags from user account
        await update(ref(database, `users/${currentUser.uid}`), {
            deletionScheduled: false,
            deletionRequestedAt: null,
            accountStatus: 'active'
        });
        
        showToast('Yêu cầu xóa tài khoản đã được hủy thành công! Tài khoản của bạn đã được khôi phục.');
        
        // Close modal
        setTimeout(() => {
            closePendingDeletionModal();
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = originalHTML;
        }, 1500);
        
    } catch (error) {
        console.error('Error canceling deletion:', error);
        showToast('Có lỗi xảy ra khi hủy yêu cầu. Vui lòng thử lại!', 'error');
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = originalHTML;
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
        'pending': {
            text: 'Chờ xử lý',
            class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        },
        'processing': {
            text: 'Chờ xử lý',  // Hiển thị như pending
            class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        },
        'shipped': {
            text: 'Đang giao hàng',
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

    const config = statusConfig[status] || statusConfig['pending'];
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${config.class}">${config.text}</span>`;
}

// ============================================================================
// ORDER DETAILS MODAL
// ============================================================================

function showOrderDetails(orderId) {
    const order = allUserOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('Không tìm thấy đơn hàng!', 'error');
        return;
    }

    // Populate modal data
    document.getElementById('modal-order-id').textContent = `#${order.orderId || order.id}`;
    document.getElementById('modal-order-date').textContent = `Ngày đặt: ${formatDate(order.createdAt)}`;
    document.getElementById('modal-order-status').innerHTML = getStatusBadge(order.status);
    
    // Customer info
    const customerInfo = order.customerInfo || {};
    document.getElementById('modal-customer-name').textContent = customerInfo.fullname || order.customerName || 'N/A';
    document.getElementById('modal-customer-phone').textContent = customerInfo.phone || order.customerPhone || 'N/A';
    document.getElementById('modal-customer-email').textContent = customerInfo.email || order.userEmail || 'N/A';
    
    const address = customerInfo.address ? 
        `${customerInfo.address}, ${customerInfo.city || ''}` : 
        (order.shippingAddress || 'N/A');
    document.getElementById('modal-customer-address').textContent = address;

    // Order items
    const itemsContainer = document.getElementById('modal-order-items');
    if (order.items && order.items.length > 0) {
        itemsContainer.innerHTML = order.items.map(item => `
            <div class="flex items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    ${item.image ? 
                        `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">` : 
                        `<div class="w-full h-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-gray-400">image</span>
                        </div>`
                    }
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-sm">${item.name || 'Sản phẩm'}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${item.size ? `Size: ${item.size}` : ''} 
                        ${item.color ? `• Màu: ${item.color}` : ''}
                    </p>
                    <p class="text-xs text-gray-500">Số lượng: ${item.quantity || 1}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-primary">${formatPrice(item.price * item.quantity)}</p>
                    <p class="text-xs text-gray-500">${formatPrice(item.price)}/sp</p>
                </div>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Không có thông tin sản phẩm</p>';
    }

    // Order summary
    document.getElementById('modal-subtotal').textContent = formatPrice(order.subtotal || 0);
    document.getElementById('modal-tax').textContent = formatPrice(order.tax || 0);
    document.getElementById('modal-total').textContent = formatPrice(order.total || 0);
    document.getElementById('modal-payment-method').textContent = order.paymentMethod || 'COD';

    // Action buttons logic
    const confirmBtn = document.getElementById('btn-confirm-received');
    const cancelBtn = document.getElementById('btn-cancel-order');
    
    // Luôn hiển thị cả 2 nút
    confirmBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
    
    // Nút "Đã nhận hàng" - chỉ enable khi status = 'shipped'
    if (order.status === 'shipped') {
        confirmBtn.disabled = false;
        confirmBtn.className = 'flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium';
        confirmBtn.onclick = () => confirmOrderReceived(orderId);
    } else {
        confirmBtn.disabled = true;
        confirmBtn.className = 'flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-medium';
        confirmBtn.onclick = null;
    }// pending hoặc processing đều cho phép hủy
        
    
    // Nút "Hủy đơn hàng" - disable khi shipped/delivered/cancelled
    if (order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled') {
        cancelBtn.disabled = false;
        cancelBtn.className = 'flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium';
        cancelBtn.onclick = () => cancelOrder(orderId);
    } else {
        cancelBtn.disabled = true;
        cancelBtn.className = 'flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-medium';
        cancelBtn.onclick = null;
    }

    // Show modal
    const modal = document.getElementById('order-details-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

async function confirmOrderReceived(orderId) {
    // Show confirmation modal
    showConfirmReceivedModal(orderId);
}

function showConfirmReceivedModal(orderId) {
    const modal = document.getElementById('confirm-received-modal');
    const closeBtn = document.getElementById('btn-confirm-received-close');
    const submitBtn = document.getElementById('btn-confirm-received-submit');
    
    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
    
    // Close modal function
    const closeConfirmModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };
    
    // Handle close button
    const handleClose = () => {
        closeConfirmModal();
        closeBtn.removeEventListener('click', handleClose);
        submitBtn.removeEventListener('click', handleSubmit);
    };
    
    // Handle submit
    const handleSubmit = async () => {
        const originalText = submitBtn.innerHTML;
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...';

            // Update order status to delivered
            const orderRef = ref(database, `orders/${orderId}`);
            await update(orderRef, {
                status: 'delivered',
                deliveredAt: Date.now(),
                updatedAt: Date.now()
            });

            showToast('Đã xác nhận nhận hàng thành công!');
            
            // Reload orders to update UI
            if (currentUser) {
                await loadUserOrders(currentUser.uid);
            }
            
            // Close modals
            closeConfirmModal();
            closeOrderDetailsModal();

        } catch (error) {
            console.error('Error confirming order:', error);
            showToast('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        } finally {
            closeBtn.removeEventListener('click', handleClose);
            submitBtn.removeEventListener('click', handleSubmit);
        }
    };
    
    closeBtn.addEventListener('click', handleClose);
    submitBtn.addEventListener('click', handleSubmit);
}

async function cancelOrder(orderId) {
    // Show cancel reason modal
    showCancelReasonModal(orderId);
}

function showCancelReasonModal(orderId) {
    const modal = document.getElementById('cancel-reason-modal');
    const input = document.getElementById('cancel-reason-input');
    const closeBtn = document.getElementById('btn-cancel-reason-close');
    const submitBtn = document.getElementById('btn-cancel-reason-submit');
    
    // Clear previous input
    input.value = '';
    
    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    // Close modal function
    const closeCancelModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };
    
    // Handle close button
    const handleClose = () => {
        closeCancelModal();
        closeBtn.removeEventListener('click', handleClose);
        submitBtn.removeEventListener('click', handleSubmit);
    };
    
    // Handle submit
    const handleSubmit = async () => {
        const reason = input.value.trim();
        if (!reason) {
            showToast('Vui lòng nhập lý do hủy đơn', 'error');
            input.focus();
            return;
        }
        
        const originalText = submitBtn.innerHTML;
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang hủy...';

            // Update order status to cancelled
            const orderRef = ref(database, `orders/${orderId}`);
            await update(orderRef, {
                status: 'cancelled',
                cancelledAt: Date.now(),
                cancelReason: reason,
                updatedAt: Date.now()
            });

            showToast('Đơn hàng đã được hủy!');
            
            // Reload orders to update UI
            if (currentUser) {
                await loadUserOrders(currentUser.uid);
            }
            
            // Close modals
            closeCancelModal();
            closeOrderDetailsModal();

        } catch (error) {
            console.error('Error cancelling order:', error);
            showToast('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        } finally {
            closeBtn.removeEventListener('click', handleClose);
            submitBtn.removeEventListener('click', handleSubmit);
        }
    };
    
    closeBtn.addEventListener('click', handleClose);
    submitBtn.addEventListener('click', handleSubmit);
    
    // Allow Enter to submit
    const handleEnter = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
            input.removeEventListener('keydown', handleEnter);
        }
    };
    input.addEventListener('keydown', handleEnter);
}

// Setup modal close button
document.getElementById('close-order-modal')?.addEventListener('click', closeOrderDetailsModal);

// Make functions available globally
window.showOrderDetails = showOrderDetails;
window.filterOrders = filterOrders;

// ============================================================================
// ORDER FILTER FUNCTIONS
// ============================================================================

function filterOrders(status) {
    console.log('🔍 Filter clicked:', status);
    console.log('📦 Total orders:', allUserOrders.length);
    console.log('📦 Orders data:', allUserOrders.map(o => ({ id: o.orderId, status: o.status })));
    
    currentOrderFilter = status;
    
    // Update UI - highlight active filter button in both Dashboard and Orders Tab
    const filters = ['all', 'pending', 'shipped', 'delivered', 'cancelled'];
    filters.forEach(filter => {
        // Dashboard filter buttons
        const btnDashboard = document.getElementById(`order-filter-${filter}`);
        if (btnDashboard) {
            if (filter === status) {
                btnDashboard.className = 'px-4 py-2 bg-white dark:bg-background-dark text-gray-900 dark:text-white text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap';
            } else {
                btnDashboard.className = 'px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium rounded-lg transition-all whitespace-nowrap';
            }
        }
        
        // Orders Tab filter buttons
        const btnTab = document.getElementById(`order-filter-${filter}-tab`);
        if (btnTab) {
            if (filter === status) {
                btnTab.className = 'px-4 py-2 bg-white dark:bg-background-dark text-gray-900 dark:text-white text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap';
            } else {
                btnTab.className = 'px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium rounded-lg transition-all whitespace-nowrap';
            }
        }
    });
    
    // Re-render orders with filter applied
    renderOrderHistory(allUserOrders);
}

function getFilterLabel(status) {
    const labels = {
        'pending': 'chờ xử lý',
        'shipped': 'đang giao',
        'delivered': 'đã giao',
        'cancelled': 'đã hủy'
    };
    return labels[status] || '';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function showToast(message, type = 'success') {
    if (window.showToast) {
        window.showToast(message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeOrders) unsubscribeOrders();
});

console.log('✅ Account page module loaded');
