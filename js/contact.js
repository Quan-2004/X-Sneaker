// Contact Form Handler for X-Sneaker
// Saves contact form submissions to Firebase Realtime Database

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, push, set } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const database = getFirebaseDatabase();

// ============================================================================
// FORM HANDLING
// ============================================================================

async function submitContactForm(formData) {
    try {
        // Create submission object
        const submission = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone') || '',
            subject: formData.get('subject') || 'Liên hệ chung',
            message: formData.get('message'),
            submittedAt: Date.now(),
            status: 'pending',
            replied: false
        };
        
        // Validate required fields
        if (!submission.name || !submission.email || !submission.message) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(submission.email)) {
            throw new Error('Email không hợp lệ');
        }
        
        // Check if database is available
        if (!database) {
            throw new Error('Không thể kết nối đến database. Vui lòng thử lại sau.');
        }
        
        // Save to Firebase
        const contactsRef = ref(database, 'contact-submissions');
        const newSubmissionRef = push(contactsRef);
        await set(newSubmissionRef, submission);
        
        console.log('✅ Contact form submitted successfully:', newSubmissionRef.key);
        return { success: true, id: newSubmissionRef.key };
        
    } catch (error) {
        console.error('❌ Error submitting contact form:', error);
        
        // Provide more specific error messages
        if (error.code === 'PERMISSION_DENIED') {
            throw new Error('Không có quyền gửi tin nhắn. Vui lòng thử lại sau.');
        } else if (error.message.includes('network')) {
            throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.');
        }
        
        throw error;
    }
}

// ============================================================================
// UI HANDLING
// ============================================================================

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) {
        console.warn('⚠️ Contact form not found');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Hide any previous errors
        const errorDiv = document.getElementById('form-error');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        
        try {
            console.log('📧 Submitting contact form...');
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="material-symbols-outlined animate-spin">progress_activity</span>
                Đang gửi...
            `;
            
            // Get form data
            const formData = new FormData(form);
            
            console.log('📋 Form data:', {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                message: formData.get('message')?.substring(0, 50) + '...'
            });
            
            // Submit to Firebase
            const result = await submitContactForm(formData);
            
            if (result.success) {
                console.log('✅ Form submitted successfully!');
                
                // Show success message
                showSuccessMessage();
                
                // Reset form
                form.reset();
                
                // Show toast notification
                if (window.showToast) {
                    window.showToast('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
                }
            }
            
        } catch (error) {
            console.error('❌ Form submission error:', error);
            
            // Show error message
            const errorMessage = error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            showErrorMessage(errorMessage);
            
            // Show toast notification
            if (window.showToast) {
                window.showToast(errorMessage, 'error');
            } else {
                // Fallback if showToast not available
                alert(errorMessage);
            }
        } finally {
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    console.log('✅ Contact form initialized');
}

function showSuccessMessage() {
    const formContainer = document.getElementById('contact-form')?.parentElement;
    if (!formContainer) return;
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center animate-fadeIn';
    successDiv.innerHTML = `
        <span class="material-symbols-outlined text-6xl text-green-600 dark:text-green-400 mb-4">check_circle</span>
        <h3 class="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">Gửi Thành Công!</h3>
        <p class="text-green-700 dark:text-green-300 mb-6">
            Cảm ơn bạn đã liên hệ với X-Sneaker. Chúng tôi sẽ phản hồi trong vòng 24-48 giờ.
        </p>
        <button onclick="location.reload()" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-colors">
            Gửi Tin Nhắn Khác
        </button>
    `;
    
    // Replace form with success message
    formContainer.innerHTML = '';
    formContainer.appendChild(successDiv);
    
    // Scroll to success message
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showErrorMessage(message) {
    const errorDiv = document.getElementById('form-error');
    
    if (errorDiv) {
        errorDiv.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0">error</span>
                <div>
                    <p class="font-bold text-sm">Lỗi gửi tin nhắn</p>
                    <p class="text-sm mt-1">${message}</p>
                </div>
            </div>
        `;
        errorDiv.classList.remove('hidden');
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto hide after 8 seconds
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 8000);
    } else {
        // Fallback if error div doesn't exist
        console.error('Error div not found, showing alert');
        alert(message);
    }
}

// ============================================================================
// VALIDATION
// ============================================================================

function setupRealtimeValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    // Email validation
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const email = emailInput.value.trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput.classList.add('border-red-500');
                showFieldError(emailInput, 'Email không hợp lệ');
            } else {
                emailInput.classList.remove('border-red-500');
                hideFieldError(emailInput);
            }
        });
    }
    
    // Phone validation (optional but if provided, must be valid)
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('blur', () => {
            const phone = phoneInput.value.trim();
            if (phone && !/^[0-9]{10,11}$/.test(phone)) {
                phoneInput.classList.add('border-red-500');
                showFieldError(phoneInput, 'Số điện thoại không hợp lệ (10-11 số)');
            } else {
                phoneInput.classList.remove('border-red-500');
                hideFieldError(phoneInput);
            }
        });
    }
}

function showFieldError(input, message) {
    let errorSpan = input.nextElementSibling;
    
    if (!errorSpan || !errorSpan.classList.contains('field-error')) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'field-error text-red-500 text-xs mt-1';
        input.parentElement.appendChild(errorSpan);
    }
    
    errorSpan.textContent = message;
}

function hideFieldError(input) {
    const errorSpan = input.nextElementSibling;
    if (errorSpan && errorSpan.classList.contains('field-error')) {
        errorSpan.remove();
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing contact form...');
    
    setupContactForm();
    setupRealtimeValidation();
    
    console.log('✅ Contact form ready');
});

console.log('✅ Contact module loaded');
