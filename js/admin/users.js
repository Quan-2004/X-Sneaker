import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const usersRef = ref(db, 'users');

let currentUsers = {};
let isCurrentUserAdmin = false;
let isInitialized = false;

function renderTable(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!users) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No users found.</td></tr>';
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
                    <button onclick="window.usersModule.editUser('${id}')" class="text-blue-500 hover:text-blue-700 transition" title="Edit User">
                        <span class="material-symbols-rounded text-xl">edit</span>
                    </button>
                    <button onclick="window.usersModule.deleteUser('${id}')" class="text-red-500 hover:text-red-700 transition" title="Delete User">
                        <span class="material-symbols-rounded text-xl">delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadUsers() {
    // Only call if table exists (tab is active)
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    const auth = getFirebaseAuth();
    
    // Check admin status again if needed, or rely on cached
    if (!isCurrentUserAdmin) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">⛔ Access Denied: You don't have admin permissions</td></tr>`;
        return;
    }

    onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
        renderTable(users);
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
            // Check if current user is admin
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
function editUser(userId) {
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
    if(modal) {
        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-fullname').value = user.fullName || '';
        document.getElementById('edit-email').value = user.email || '';
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

    const user = currentUsers[userId];
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
            closeUserModal();
        })
        .catch((error) => {
            console.error('Error updating user:', error);
            alert('❌ Failed to update user: ' + error.message);
        });
}

function closeUserModal() {
    const modal = document.getElementById('user-edit-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Reload function for Tab Switching
function reload() {
    console.log('Users Module: Reloading...');
    // Re-bind modal buttons if they are static/global? 
    // Actually the save/close buttons in HTML use `window.closeUserModal()` etc.
    // So we just need to ensure `window.closeUserModal` is mapped to our internal function via `window.usersModule`.
    // OR we can make them global manually here.
    
    // Check if table exists
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
    closeUserModal
};

// Make functions globally available for HTML onclicks
window.editUser = editUser;
window.deleteUser = deleteUser;
window.saveUserChanges = saveUserChanges;
window.closeUserModal = closeUserModal;

init();
console.log('User Module Loaded');
