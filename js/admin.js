// Supabase Configuration
const SUPABASE_URL = 'https://fkhmwddkosjzatwuxmnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraG13ZGRrb3NqemF0d3V4bW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEwOTksImV4cCI6MjA5NTgxNzA5OX0.ogtAR9ibm8jeyL-EBqlKUBUI7pUGL_UXzseA8RsmDcA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const uploadForm = document.getElementById('upload-form');
const adminGalleryGrid = document.getElementById('admin-gallery-grid');
const uploadStatus = document.getElementById('upload-status');

// Check Auth State on Load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    } else {
        showLogin();
    }
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.textContent = 'Logging in...';
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorDiv.textContent = error.message;
    } else {
        errorDiv.textContent = '';
        showDashboard();
    }
});

// Logout
async function logout() {
    await supabase.auth.signOut();
    showLogin();
}

// View Toggles
function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadAdminGallery();
}

function showLogin() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
}

// Upload Photo
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('photo-file');
    const altInput = document.getElementById('photo-alt');
    const btn = document.getElementById('upload-btn');
    
    const file = fileInput.files[0];
    const altText = altInput.value;
    
    if (!file) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';

    try {
        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('gallery')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('gallery')
            .getPublicUrl(filePath);

        // 3. Insert into Database
        const { error: dbError } = await supabase
            .from('photos')
            .insert([
                { url: publicUrl, alt_text: altText }
            ]);

        if (dbError) throw dbError;

        // Success
        uploadStatus.textContent = 'Photo uploaded successfully!';
        uploadStatus.classList.add('success');
        uploadForm.reset();
        loadAdminGallery();

    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.classList.add('error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload to Gallery';
    }
});

// Load Gallery
async function loadAdminGallery() {
    adminGalleryGrid.innerHTML = '<p>Loading photos...</p>';
    
    const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        adminGalleryGrid.innerHTML = `<p class="error">Error loading photos: ${error.message}</p>`;
        return;
    }

    if (photos.length === 0) {
        adminGalleryGrid.innerHTML = '<p>No photos in the gallery yet.</p>';
        return;
    }

    adminGalleryGrid.innerHTML = photos.map(photo => `
        <div class="admin-gallery-item" id="photo-${photo.id}">
            <img src="${photo.url}" alt="${photo.alt_text}">
            <button class="btn-delete" onclick="deletePhoto('${photo.id}', '${photo.url}')" title="Delete Photo">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Delete Photo
async function deletePhoto(id, url) {
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) return;

    try {
        // Extract filepath from URL
        const urlParts = url.split('/gallery/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];
            // 1. Delete from Storage
            await supabase.storage.from('gallery').remove([filePath]);
        }

        // 2. Delete from Database
        const { error } = await supabase
            .from('photos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Remove element from DOM
        document.getElementById(`photo-${id}`).remove();
        
        if (adminGalleryGrid.children.length === 0) {
            adminGalleryGrid.innerHTML = '<p>No photos in the gallery yet.</p>';
        }

    } catch (error) {
        alert(`Error deleting photo: ${error.message}`);
    }
}

// Init
checkAuth();
