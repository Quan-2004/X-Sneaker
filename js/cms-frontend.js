import { getFirebaseDatabase } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const db = getFirebaseDatabase();

/**
 * Applies global settings (Logo, Colors, Footer)
 */
function applyGlobalSettings() {
    const settingsRef = ref(db, 'settings/general');
    
    onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. Logo
        if (data.logoUrl) {
            document.querySelectorAll('img[alt="X-Sneaker Logo"]').forEach(img => {
                img.src = data.logoUrl;
            });
        }

        // 2. Site Name (Title)
        if (data.siteName) {
            document.title = data.siteName + (document.title.includes('|') ? ` | ${document.title.split('|')[1].trim()}` : '');
            document.querySelectorAll('.logo-text').forEach(el => el.textContent = data.siteName);
        }

        // 3. Primary Color
        if (data.primaryColor) {
            document.documentElement.style.setProperty('--color-primary', data.primaryColor);
            
            // Tailwind Config update might vary, but CSS variables are easiest for runtime
            // We can inject a style tag to override tailwind classes if needed, 
            // but simplified approach: usage of valid CSS var in tailwind config would be best.
            // For now, let's try to override some raw CSS or rely on the custom-property approach if we had set it up.
            // Since we used hardcoded hex in tailwind config in HTML, let's inject a style block to override text-primary and bg-primary
            
            const styleId = 'dynamic-theme-styles';
            let styleTag = document.getElementById(styleId);
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = styleId;
                document.head.appendChild(styleTag);
            }
            
            styleTag.innerHTML = `
                .text-primary { color: ${data.primaryColor} !important; }
                .bg-primary { background-color: ${data.primaryColor} !important; }
                .border-primary { border-color: ${data.primaryColor} !important; }
                .focus\\:ring-primary:focus { --tw-ring-color: ${data.primaryColor} !important; }
                .hover\\:text-primary:hover { color: ${data.primaryColor} !important; }
                .group:hover .group-hover\\:bg-primary { background-color: ${data.primaryColor} !important; }
                .group:hover .group-hover\\:text-primary { color: ${data.primaryColor} !important; }
            `;
        }

        // 4. Footer Description
        if (data.footerDescription) {
            const footerDesc = document.querySelector('footer p.text-gray-400');
            if (footerDesc) footerDesc.textContent = data.footerDescription;
        }

        // 5. Social Links
        if (data.socialLinks) {
            // This requires identifying which link is which in the DOM. 
            // We'll skip complex mapping unless IDs are added.
        }
    });
}

/**
 * Applies About Us Content
 */
function applyAboutContent() {
    if (!location.pathname.includes('About-us.html')) return;

    onValue(ref(db, 'settings/aboutUs'), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.innerText = val;
        };

        if (data.heroImage) {
            const hero = document.getElementById('about-hero');
            if (hero) hero.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url("${data.heroImage}")`;
        }
        
        setTxt('about-title', data.title);
        setTxt('about-subtitle', data.subtitle);
        // Story is usually long text, maybe html? using innerText for safety for now
        setTxt('about-story', data.story); 
        
        setTxt('about-mission-text', data.mission);
        setTxt('about-quality-text', data.quality);
        setTxt('about-community-text', data.community);
    });
}

/**
 * Applies Contact Content
 */
function applyContactContent() {
    if (!location.pathname.includes('Contact-Us.html')) return;

    onValue(ref(db, 'settings/contactInfo'), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.innerText = val;
        };

        setTxt('contact-phone', data.phone);
        setTxt('contact-email', data.email);
        setTxt('contact-address', data.address);
        
        if (data.mapImage) {
            const mapBg = document.getElementById('contact-map-bg');
            if (mapBg) mapBg.style.backgroundImage = `url("${data.mapImage}")`;
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    applyGlobalSettings();
    applyAboutContent();
    applyContactContent();
});
