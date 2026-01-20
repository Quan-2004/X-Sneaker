// Firebase Authentication Module for X-Sneaker
// Version: 1.0.0

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBk41iuorgnQF0rbCr-BmlVAfMgVeIRVU8",
  authDomain: "x-sneaker.firebaseapp.com",
  databaseURL:
    "https://x-sneaker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "x-sneaker",
  storageBucket: "x-sneaker.firebasestorage.app",
  messagingSenderId: "577198860451",
  appId: "1:577198860451:web:3cf88ce9496c70e3847716",
  measurementId: "G-D43H8ELM22",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Show toast notification
 */
function showToast(message, type = "success") {
  if (window.showToast) {
    window.showToast(message);
  } else {
    alert(message);
  }
}

/**
 * Show loading state
 */
function setLoading(button, isLoading) {
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML =
      '<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...';
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

/**
 * Save user data to Realtime Database
 */
async function saveUserToDatabase(user, additionalData = {}) {
  try {
    const userRef = ref(database, `users/${user.uid}`);

    // Check if user exists
    const snapshot = await get(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData.displayName || "User",
      photoURL: user.photoURL || "../image/default-avatar.jpg",
      emailVerified: user.emailVerified,
      lastLogin: serverTimestamp(),
      ...additionalData,
    };

    if (!snapshot.exists()) {
      // New user - create full profile
      userData.createdAt = serverTimestamp();
      userData.role = "customer";
      userData.addresses = [];
      userData.wishlist = [];
      userData.loyaltyPoints = 0;
      await set(userRef, userData);
    } else {
      // Existing user - update login time and basic info
      await update(userRef, {
        lastLogin: serverTimestamp(),
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: userData.emailVerified,
      });
    }

    return userData;
  } catch (error) {
    console.error("Error saving user to database:", error);
    throw error;
  }
}

/**
 * Get user data from database
 */
export async function getUserData(uid) {
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Register new user with email and password
 */
export async function registerUser(email, password, displayName) {
  const submitButton = document.querySelector('button[type="submit"]');

  try {
    setLoading(submitButton, true);

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, {
      displayName: displayName,
    });

    // Save to database
    await saveUserToDatabase(user, { displayName });

    showToast(`Chào mừng ${displayName}! Đăng ký thành công.`);

    // Redirect to account page
    setTimeout(() => {
      window.location.href = "Account.html";
    }, 1500);
  } catch (error) {
    console.error("Registration error:", error);

    let errorMessage = "Đăng ký thất bại. Vui lòng thử lại.";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "Email này đã được sử dụng!";
        break;
      case "auth/invalid-email":
        errorMessage = "Email không hợp lệ!";
        break;
      case "auth/weak-password":
        errorMessage = "Mật khẩu quá yếu! Vui lòng dùng mật khẩu mạnh hơn.";
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Đăng ký bị vô hiệu hóa. Vui lòng liên hệ admin.";
        break;
    }

    showToast(errorMessage, "error");
    throw error;
  } finally {
    setLoading(submitButton, false);
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email, password) {
  const submitButton = document.querySelector('button[type="submit"]');

  try {
    setLoading(submitButton, true);

    // Sign in
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Update database
    await saveUserToDatabase(user);

    showToast(`Chào mừng trở lại, ${user.displayName || "bạn"}!`);

    // Redirect to account page
    setTimeout(() => {
      window.location.href = "Account.html";
    }, 1500);
  } catch (error) {
    console.error("Login error:", error);

    let errorMessage = "Đăng nhập thất bại. Vui lòng thử lại.";

    switch (error.code) {
      case "auth/invalid-email":
        errorMessage = "Email không hợp lệ!";
        break;
      case "auth/user-disabled":
        errorMessage = "Tài khoản đã bị vô hiệu hóa!";
        break;
      case "auth/user-not-found":
        errorMessage = "Không tìm thấy tài khoản với email này!";
        break;
      case "auth/wrong-password":
        errorMessage = "Mật khẩu không đúng!";
        break;
      case "auth/invalid-credential":
        errorMessage = "Email hoặc mật khẩu không đúng!";
        break;
    }

    showToast(errorMessage, "error");
    throw error;
  } finally {
    setLoading(submitButton, false);
  }
}

/**
 * Login with Google
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save to database
    await saveUserToDatabase(user);

    showToast(`Chào mừng ${user.displayName}!`);

    // Redirect
    setTimeout(() => {
      window.location.href = "Account.html";
    }, 1500);
  } catch (error) {
    console.error("Google login error:", error);

    let errorMessage = "Đăng nhập Google thất bại!";

    switch (error.code) {
      case "auth/popup-closed-by-user":
        errorMessage = "Bạn đã đóng cửa sổ đăng nhập.";
        break;
      case "auth/cancelled-popup-request":
        return; // User cancelled, don't show error
      case "auth/popup-blocked":
        errorMessage = "Popup bị chặn! Vui lòng cho phép popup.";
        break;
    }

    showToast(errorMessage, "error");
    throw error;
  }
}

/**
 * Login with Facebook
 */
export async function loginWithFacebook() {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;

    // Save to database
    await saveUserToDatabase(user);

    showToast(`Chào mừng ${user.displayName}!`);

    // Redirect
    setTimeout(() => {
      window.location.href = "Account.html";
    }, 1500);
  } catch (error) {
    console.error("Facebook login error:", error);

    let errorMessage = "Đăng nhập Facebook thất bại!";

    switch (error.code) {
      case "auth/popup-closed-by-user":
        errorMessage = "Bạn đã đóng cửa sổ đăng nhập.";
        break;
      case "auth/cancelled-popup-request":
        return; // User cancelled
      case "auth/popup-blocked":
        errorMessage = "Popup bị chặn! Vui lòng cho phép popup.";
        break;
      case "auth/account-exists-with-different-credential":
        errorMessage =
          "Email này đã được sử dụng với phương thức đăng nhập khác!";
        break;
    }

    showToast(errorMessage, "error");
    throw error;
  }
}

/**
 * Reset password
 */
export async function resetPassword(email) {
  const submitButton = document.querySelector('button[type="submit"]');

  try {
    setLoading(submitButton, true);

    await sendPasswordResetEmail(auth, email);

    showToast(
      "Email khôi phục mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.",
    );

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = "login.html";
    }, 3000);
  } catch (error) {
    console.error("Password reset error:", error);

    let errorMessage = "Không thể gửi email khôi phục!";

    switch (error.code) {
      case "auth/invalid-email":
        errorMessage = "Email không hợp lệ!";
        break;
      case "auth/user-not-found":
        errorMessage = "Không tìm thấy tài khoản với email này!";
        break;
    }

    showToast(errorMessage, "error");
    throw error;
  } finally {
    setLoading(submitButton, false);
  }
}

/**
 * Logout user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    showToast("Đã đăng xuất thành công!");

    // Redirect to home
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("Logout error:", error);
    showToast("Đăng xuất thất bại!", "error");
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if user is logged in
 */
export function isUserLoggedIn() {
  return auth.currentUser !== null;
}

// ============================================================================
// AUTH STATE OBSERVER
// ============================================================================

/**
 * Listen to auth state changes
 */
export function initAuthStateObserver(callback) {
  onAuthStateChanged(auth, (user) => {
    if (callback) {
      callback(user);
    }
  });
}

// Auto-initialize auth state observer for protected pages
if (window.location.pathname.includes("Account.html")) {
  initAuthStateObserver((user) => {
    if (!user) {
      // Not logged in, redirect to login
      window.location.href = "login.html";
    }
  });
}

// Export auth and database instances for advanced usage
export { auth, database };

console.log("✅ Firebase Auth module loaded successfully");
