import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect } from '../cloudinary-upload.js';

const db = getFirebaseDatabase();

// DOM Elements
const btnSave = document.getElementById('btn-save-cms');
const tabBtns = document.querySelectorAll('.cms-tab-btn');
const tabContents = document.querySelectorAll('.cms-tab-content');

// About Elements
const aboutHeroFile = document.getElementById('cms-about-hero-file');
const aboutHeroUrl = document.getElementById('cms-about-hero-url');
const aboutHeroPreview = document.getElementById('cms-about-hero-preview');
const aboutTitle = document.getElementById('cms-about-title');
const aboutSubtitle = document.getElementById('cms-about-subtitle');
const aboutStory = document.getElementById('cms-about-story');
const aboutMission = document.getElementById('cms-about-mission');
const aboutQuality = document.getElementById('cms-about-quality');
const aboutCommunity = document.getElementById('cms-about-community');

// Contact Elements
const contactPhone = document.getElementById('cms-contact-phone');
const contactEmail = document.getElementById('cms-contact-email');
const contactAddress = document.getElementById('cms-contact-address');
const contactMap = document.getElementById('cms-contact-map');

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class
        tabBtns.forEach(b => {
            b.classList.remove('text-primary', 'border-primary');
            b.classList.add('text-slate-500', 'dark:text-slate-400');
        });
        // Add active class
        btn.classList.add('text-primary', 'border-primary');
        btn.classList.remove('text-slate-500', 'dark:text-slate-400');

        // Show Content
        const targetId = btn.getAttribute('data-target');
        tabContents.forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// Image Preview
aboutHeroFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            aboutHeroPreview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Load Data
function initCMS() {
    // Load About
    onValue(ref(db, 'settings/aboutUs'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            aboutHeroUrl.value = data.heroImage || '';
            aboutHeroPreview.src = data.heroImage || 'https://placehold.co/100x50';
            aboutTitle.value = data.title || '';
            aboutSubtitle.value = data.subtitle || '';
            aboutStory.value = data.story || '';
            aboutMission.value = data.mission || '';
            aboutQuality.value = data.quality || '';
            aboutCommunity.value = data.community || '';
        }
    });

    // Load Contact
    onValue(ref(db, 'settings/contactInfo'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            contactPhone.value = data.phone || '';
            contactEmail.value = data.email || '';
            contactAddress.value = data.address || '';
            contactMap.value = data.mapImage || '';
        }
    });
}

// Save Data
btnSave.addEventListener('click', async () => {
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">rotate_right</span> Saving...';
    btnSave.disabled = true;

    try {
        // Upload Hero Image if changed
        let heroImageUrl = aboutHeroUrl.value;
        if (aboutHeroFile.files[0]) {
            heroImageUrl = await uploadAvatarDirect(aboutHeroFile.files[0]);
        }

        const aboutData = {
            heroImage: heroImageUrl,
            title: aboutTitle.value,
            subtitle: aboutSubtitle.value,
            story: aboutStory.value,
            mission: aboutMission.value,
            quality: aboutQuality.value,
            community: aboutCommunity.value
        };

        const contactData = {
            phone: contactPhone.value,
            email: contactEmail.value,
            address: contactAddress.value,
            mapImage: contactMap.value
        };

        // Save in parallel
        await Promise.all([
            set(ref(db, 'settings/aboutUs'), aboutData),
            set(ref(db, 'settings/contactInfo'), contactData)
        ]);

        alert('CMS Content Saved Successfully!');

    } catch (error) {
        console.error(error);
        alert('Failed to save content');
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
});

initCMS();
console.log('CMS Module Loaded');
