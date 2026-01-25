import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect } from '../cloudinary-upload.js';

const db = getFirebaseDatabase();
const settingsRef = ref(db, 'settings/general');

// DOM Elements
const btnSave = document.getElementById('btn-save-settings');
const logoFile = document.getElementById('setting-logo-file');
const logoUrlInput = document.getElementById('setting-logo-url');
const logoPreview = document.getElementById('setting-logo-preview');
const colorInput = document.getElementById('setting-primary-color');
const colorText = document.getElementById('setting-primary-color-text');

// Init
function initSettings() {
    onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('setting-site-name').value = data.siteName || '';
            document.getElementById('setting-footer-desc').value = data.footerDescription || '';
            
            if (data.logoUrl) {
                logoPreview.src = data.logoUrl;
                logoUrlInput.value = data.logoUrl;
            }

            if (data.primaryColor) {
                colorInput.value = data.primaryColor;
                colorText.value = data.primaryColor;
            }

            if (data.socialLinks) {
                document.getElementById('social-instagram').value = data.socialLinks.instagram || '';
                document.getElementById('social-twitter').value = data.socialLinks.twitter || '';
                document.getElementById('social-tiktok').value = data.socialLinks.tiktok || '';
            }
        }
    });
}

// Color Picker Sync
colorInput.addEventListener('input', (e) => {
    colorText.value = e.target.value;
});
colorText.addEventListener('input', (e) => {
    colorInput.value = e.target.value;
});

// Logo Preview
logoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            logoPreview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Save
btnSave.addEventListener('click', async () => {
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">rotate_right</span> Saving...';
    btnSave.disabled = true;

    try {
        let logoUrl = logoUrlInput.value;
        const file = logoFile.files[0];

        if (file) {
            logoUrl = await uploadAvatarDirect(file);
        }

        const settingsData = {
            siteName: document.getElementById('setting-site-name').value,
            footerDescription: document.getElementById('setting-footer-desc').value,
            logoUrl: logoUrl,
            primaryColor: colorInput.value,
            socialLinks: {
                instagram: document.getElementById('social-instagram').value,
                twitter: document.getElementById('social-twitter').value,
                tiktok: document.getElementById('social-tiktok').value,
            },
            updatedAt: new Date().toISOString()
        };

        await set(settingsRef, settingsData);
        alert('Settings saved successfully! Frontend will update shortly.');

    } catch (error) {
        console.error('Save settings error:', error);
        alert('Failed to save settings');
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
});

initSettings();
console.log('Settings Module Loaded');
