import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue, update, remove, get, push, set } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const usersRef = ref(db, 'users');

let usersMap = {};
let usersList = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 10;
let isCurrentUserAdmin = false;
let isInitialized = false;

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderStats() {
    const total = usersList.length;
    
    // New this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomers = usersList.filter(u => {
        const joinDate = u.createdAt ? new Date(u.createdAt) : new Date(0);
        return joinDate >= startOfMonth;
    }).length;

    // Premium members (just an example filter for now, maybe check totalSpent > X or role)
    // For now, let's assume 'admin' role or arbitrary logic. Let's stick to role logic or totalOrders > 5
    const premiumCustomers = usersList.filter(u => {
        const orderCount = u.orders ? Object.keys(u.orders).length : 0;
        return orderCount >= 5; // Example criteria
    }).length;

    // Active today (users with recent order or login - we only have order dates easily accessible or maybe createdAt)
    // Let's use "Joined Today" as proxy for "Active" if we don't have lastLogin
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activeToday = usersList.filter(u => {
        const joinDate = u.createdAt ? new Date(u.createdAt) : new Date(0);
        return joinDate >= startOfDay;
    }).length;

    // Animation helper
    const animateValue = (id, end) => {
        const obj = document.getElementById(id);
        if (!obj) return;
        obj.innerText = end.toLocaleString('vi-VN');
    };

    animateValue('stat-cust-total', total);
    animateValue('stat-cust-new', newCustomers);
    animateValue('stat-cust-premium', premiumCustomers);
    animateValue('stat-cust-active', activeToday);
}

function renderTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">No users found matching your search.</td></tr>';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = filteredUsers.slice(start, end);

    pageUsers.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'User')}&background=random`;
        const roleBadge = (user.isAdmin || user.role === 'admin') 
            ? '<span class="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Admin</span>' 
            : '<span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded uppercase">Customer</span>';
        
        const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A';
        const ordersCount = user.orders ? Object.keys(user.orders).length : 0;
        const totalSpent = 0; // Placeholder: Calculate from orders if needed

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img src="${avatar}" class="w-full h-full object-cover" alt="${user.fullName}">
                    </div>
                    <div>
                        <p class="font-bold text-slate-900 dark:text-white text-sm">${user.fullName || 'Unknown User'}</p>
                        <p class="text-xs text-slate-400 font-normal hidden sm:block">ID: ${user.id.substring(0,6)}...</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${user.email}</td>
            <td class="px-6 py-4 font-bold text-slate-800 dark:text-white">${ordersCount}</td>
            <td class="px-6 py-4 font-bold text-slate-800 dark:text-white">${formatCurrency(totalSpent)}</td>
            <td class="px-6 py-4 mb-2">${roleBadge}</td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium text-sm">${joinedDate}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.usersModule.editUser('${user.id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Edit User">
                        <span class="material-symbols-rounded text-[20px]">edit</span>
                    </button>
                    <button onclick="window.usersModule.deleteUser('${user.id}')" class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Delete User">
                        <span class="material-symbols-rounded text-[20px]">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderPagination() {
    const container = document.getElementById('customers-pagination');
    if (!container) return;

    const totalItems = filteredUsers.length;
    if (totalItems === 0) {
        container.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    let paginationHTML = `
        <p class="text-sm text-slate-500 font-medium">Showing <span class="text-slate-900 dark:text-white font-bold">${startItem}-${endItem}</span> of <span class="text-slate-900 dark:text-white font-bold">${totalItems}</span> results</p>
        <div class="flex items-center gap-2">
            <button onclick="window.usersModule.setPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="p-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all">
                <span class="material-symbols-rounded text-[18px]">chevron_left</span>
            </button>
    `;

    // Simple pagination logic: show all pages logic or simplified 1, 2, ... N
    // For simplicity, let's just show current page and neighbors or simplified logic
    // Implementing simple logic: 1 ... Prev Curr Next ... Last
    
    // For now, simpler: Just show all if < 7, otherwise condensed? 
    // Let's stick to strict sliding window or just generic list for robust UI
    
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            const isActive = i === currentPage;
            const activeClass = "bg-primary text-white font-bold shadow-lg shadow-primary/20";
            const inactiveClass = "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-medium";
            
            paginationHTML += `
                <button onclick="window.usersModule.setPage(${i})" class="w-9 h-9 rounded-lg text-sm transition-all ${isActive ? activeClass : inactiveClass}">
                    ${i}
                </button>
            `;
        } else if (
            (i === currentPage - 2 && i > 1) || 
            (i === currentPage + 2 && i < totalPages)
        ) {
             paginationHTML += `<span class="text-slate-400 px-1">...</span>`;
        }
    }

    paginationHTML += `
            <button onclick="window.usersModule.setPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="p-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary transition-all">
                <span class="material-symbols-rounded text-[18px]">chevron_right</span>
            </button>
        </div>
    `;

    container.innerHTML = paginationHTML;
}

function setPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
}

function applyFilterAndRender() {
    const searchInput = document.getElementById('customer-search-input');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    filteredUsers = usersList.filter(user => {
        const nameMatch = user.fullName && user.fullName.toLowerCase().includes(query);
        const emailMatch = user.email && user.email.toLowerCase().includes(query);
        // Can add more filters here (e.g. ID, phone)
        return nameMatch || emailMatch;
    });

    // Default Sort: Newest First
    filteredUsers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
    });

    currentPage = 1;
    renderStats();
    renderTable();
    renderPagination();
}

function loadUsers() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return; // Not on Customers tab

    const auth = getFirebaseAuth();
    
    // Basic Admin Check
    if (!isCurrentUserAdmin) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">⛔ Access Denied: You don't have admin permissions</td></tr>`;
        return;
    }

    // Loading State
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8"><div class="loading-spinner mx-auto"></div></td></tr>';

    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            usersMap = {};
            usersList = [];
        } else {
            usersMap = data;
            // Convert to Array and inject ID
            usersList = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...value
            }));
        }
        
        applyFilterAndRender();

    }, (error) => {
        console.error('Error fetching users:', error);
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">❌ Error: ${error.message}</td></tr>`;
    });
}

function init() {
    if (isInitialized) return;

    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const currentUserRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(currentUserRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                isCurrentUserAdmin = userData.isAdmin === true || userData.role === 'admin';
                console.log('Users Module: Admin check:', isCurrentUserAdmin);
            }
        }
    });

    isInitialized = true;
}

// Actions
function sendEmail() {
    const emailList = filteredUsers.map(u => u.email).filter(e => e).join(',');
    if (!emailList) {
        alert('No customers with email found in current view.');
        return;
    }
    // Limit to reasonable length or just open mail client
    if (emailList.length > 2000) {
       alert('Too many recipients for direct mailto link. Please export list instead.');
       return;
    }
    window.location.href = `mailto:?bcc=${emailList}`;
}

function openAddUserModal() {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can adding users');
        return;
    }

    const modal = document.getElementById('user-edit-modal');
    if(modal) {
        // Reset fields
        document.getElementById('edit-user-id').value = ''; // Empty for new
        document.getElementById('edit-fullname').value = '';
        document.getElementById('edit-email').value = '';
        
        // Enable email for new users
        document.getElementById('edit-email').disabled = false;
        document.getElementById('edit-email').classList.remove('cursor-not-allowed', 'text-slate-500');
        document.getElementById('edit-email').classList.add('bg-slate-50', 'dark:bg-background-dark');
        
        document.getElementById('edit-role').value = 'customer';
        
        // Update Title
        modal.querySelector('h3').textContent = 'Add New Customer';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function editUser(userId) {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can edit users');
        return;
    }

    const user = usersMap[userId];
    if (!user) {
        alert('User not found!');
        return;
    }

    const modal = document.getElementById('user-edit-modal');
    if(modal) {
        // Update Title
        modal.querySelector('h3').textContent = 'Edit User';

        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-fullname').value = user.fullName || '';
        document.getElementById('edit-email').value = user.email || '';
        
        // Disable email for editing
        document.getElementById('edit-email').disabled = true;
        document.getElementById('edit-email').classList.add('cursor-not-allowed', 'text-slate-500');
        document.getElementById('edit-email').classList.remove('bg-slate-50', 'dark:bg-background-dark');

        document.getElementById('edit-role').value = user.role || 'customer';
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function deleteUser(userId) {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can delete users');
        return;
    }

    const user = usersMap[userId];
    if (!user) {
        alert('User not found!');
        return;
    }

    const auth = getFirebaseAuth();
    if (auth.currentUser && auth.currentUser.uid === userId) {
        alert('⚠️ Cannot delete your own account!');
        return;
    }

    if (!confirm(`⚠️ Delete User?\n\nName: ${user.fullName || 'Unknown'}\nEmail: ${user.email}\n\nThis will permanently delete:\n• User profile\n• All user data\n\nThis action CANNOT be undone!\n\nContinue?`)) {
        return;
    }

    const userRef = ref(db, `users/${userId}`);
    remove(userRef)
        .then(() => {
            alert('✅ User deleted successfully!');
        })
        .catch((error) => {
            console.error('Error deleting user:', error);
            alert('❌ Failed to delete user: ' + error.message);
        });
}

function saveUserChanges() {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can modify users');
        return;
    }

    const userId = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('edit-fullname').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const role = document.getElementById('edit-role').value;

    if (!fullName) {
        alert('❌ Full name is required!');
        return;
    }

    if (!userId && !email) {
        alert('❌ Email is required for new users!');
        return;
    }

    const updates = {
        fullName: fullName,
        role: role,
        isAdmin: role === 'admin'
    };
    
    // If Creating New User
    if (!userId) {
        updates.email = email;
        updates.createdAt = new Date().toISOString();
        updates.photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
        
        // Push generates a new ID
        const newUserRef = push(ref(db, 'users'));
        set(newUserRef, updates)
             .then(() => {
                alert('✅ User created successfully!\nNote: This user is in the database but needs to register via Auth to login.');
                closeUserModal();
            })
            .catch((error) => {
                console.error('Error creating user:', error);
                alert('❌ Failed to create user: ' + error.message);
            });
            
    } else {
        // Updating Existing
        const userRef = ref(db, `users/${userId}`);
        update(userRef, updates)
            .then(() => {
                alert('✅ User updated successfully!');
                closeUserModal();
            })
            .catch((error) => {
                console.error('Error updating user:', error);
                alert('❌ Failed to update user: ' + error.message);
            });
    }
}

function closeUserModal() {
    const modal = document.getElementById('user-edit-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function reload() {
    console.log('Users Module: Reloading...');
    
    // Bind Search Logic
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
        searchInput.oninput = () => applyFilterAndRender();
    }

    // Load Data
    const tableBody = document.getElementById('users-table-body');
    if (tableBody) {
        loadUsers();
    }
}

window.usersModule = {
    init,
    reload,
    editUser,
    deleteUser,
    saveUserChanges,
    closeUserModal,
    setPage,
    openAddUserModal,
    sendEmail
};

// Global Bindings for HTML onclick
window.editUser = editUser;
window.deleteUser = deleteUser;
window.saveUserChanges = saveUserChanges;
window.closeUserModal = closeUserModal;

init();
console.log('User Module Loaded');
