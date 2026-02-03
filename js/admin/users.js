import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const db = getFirebaseDatabase();
const usersRef = ref(db, 'users');

let currentUsers = {};
let isCurrentUserAdmin = false;

// Helper function to get table body element safely
function getTableBody() {
    return document.getElementById('users-table-body');
}

function renderTable(users) {
    const tableBody = getTableBody();
    if (!tableBody) {
        console.warn('Users table body not found in DOM');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!users) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No users found.</td></tr>';
        return;
    }

    currentUsers = users;

    Object.entries(users).forEach(([id, user]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50/50 transition-colors border-b border-gray-50';
        
        const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'User')}&background=random`;
        const roleBadge = (user.isAdmin || user.role === 'admin') 
            ? '<span class="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Admin</span>' 
            : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">Customer</span>';
        
        const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                        <img src="${avatar}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <p class="font-bold text-[#1b0e0f]">${user.fullName || 'Unknown User'}</p>
                        <p class="text-xs text-gray-500">${user.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">${roleBadge}</td>
            <td class="px-6 py-4 text-gray-600 font-medium">${joinedDate}</td>
            <td class="px-6 py-4 font-bold text-gray-800">
                ${user.orders ? Object.keys(user.orders).length : 0}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="editUser('${id}')" class="text-blue-500 hover:text-blue-700 transition" title="Edit User">
                        <span class="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onclick="deleteUser('${id}')" class="text-red-500 hover:text-red-700 transition" title="Delete User">
                        <span class="material-symbols-outlined text-xl">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ... existing code ...

function initUsers() {
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, async (user) => {
        const tableBody = getTableBody();
        if (!tableBody) {
            console.warn('Users table not ready yet');
            return;
        }
        
        if (user) {
            // Check if current user is admin
            const currentUserRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(currentUserRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                isCurrentUserAdmin = userData.isAdmin === true || userData.role === 'admin';
                
                if (!isCurrentUserAdmin) {
                    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">⛔ Access Denied: You don't have admin permissions</td></tr>`;
                    console.error('User is not admin');
                    return;
                }
                
                console.log('Admin verified, loading users...');
            }
            
            // Only fetch if authenticated and admin
            onValue(usersRef, (snapshot) => {
                const users = snapshot.val();
                renderTable(users);
            }, (error) => {
                console.error('Error fetching users:', error);
                const tb = getTableBody();
                if (tb) {
                    tb.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">❌ Error: ${error.message}<br><small>Check Firebase Rules</small></td></tr>`;
                }
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Please login to continue</td></tr>`;
        }
    });
}

initUsers();
console.log('User Module Loaded');

// Edit User Function
window.editUser = function(userId) {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can edit users');
        return;
    }

    const user = currentUsers[userId];
    if (!user) {
        alert('User not found!');
        return;
    }

    const modal = document.getElementById('user-edit-modal');
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-fullname').value = user.fullName || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-role').value = user.role || 'customer';
    
    modal.classList.remove('hidden');
};

// Delete User Function
window.deleteUser = function(userId) {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can delete users');
        return;
    }

    const user = currentUsers[userId];
    if (!user) {
        alert('User not found!');
        return;
    }

    // Prevent deleting yourself
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
};

// Save User Changes
window.saveUserChanges = function() {
    if (!isCurrentUserAdmin) {
        alert('⛔ Access Denied: Only admins can modify users');
        return;
    }

    const userId = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('edit-fullname').value.trim();
    const role = document.getElementById('edit-role').value;

    if (!fullName) {
        alert('❌ Full name is required!');
        return;
    }

    const updates = {
        fullName: fullName,
        role: role,
        isAdmin: role === 'admin'
    };

    const userRef = ref(db, `users/${userId}`);
    update(userRef, updates)
        .then(() => {
            alert('✅ User updated successfully!');
            document.getElementById('user-edit-modal').classList.add('hidden');
        })
        .catch((error) => {
            console.error('Error updating user:', error);
            alert('❌ Failed to update user: ' + error.message);
        });
};

// Close Modal
window.closeUserModal = function() {
    document.getElementById('user-edit-modal').classList.add('hidden');
};
// Send Email Function
function sendEmail() {
    alert('📧 Email feature will be implemented soon!\n\nThis will allow you to send bulk emails to customers.');
}

// Open Add User Modal
function openAddUserModal() {
    alert('➕ Add Customer feature will be implemented soon!\n\nYou can add new customers manually here.');
}

// Reload users data
function reload() {
    initUsers();
}

// Export module
window.usersModule = {
    reload,
    sendEmail,
    openAddUserModal
};