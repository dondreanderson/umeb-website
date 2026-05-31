// Supabase Configuration
const SUPABASE_URL = 'https://fkhmwddkosjzatwuxmnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraG13ZGRrb3NqemF0d3V4bW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEwOTksImV4cCI6MjA5NTgxNzA5OX0.ogtAR9ibm8jeyL-EBqlKUBUI7pUGL_UXzseA8RsmDcA';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { data: { session } } = await supabaseClient.auth.getSession();
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
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
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
    await supabaseClient.auth.signOut();
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

        const { error: uploadError } = await supabaseClient.storage
            .from('gallery')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('gallery')
            .getPublicUrl(filePath);

        // 3. Insert into Database
        const { error: dbError } = await supabaseClient
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
    
    const { data: photos, error } = await supabaseClient
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
            <div class="gallery-item-actions">
                <button class="btn-action btn-replace" onclick="openReplaceModal('${photo.id}', '${photo.url}')" title="Replace Photo">
                    <i class="fas fa-exchange-alt"></i> Replace
                </button>
            </div>
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
            await supabaseClient.storage.from('gallery').remove([filePath]);
        }

        // 2. Delete from Database
        const { error } = await supabaseClient
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

// --- Replace Modal Logic ---
let currentReplaceId = null;
let currentOriginalUrl = null;
let originalAspectRatio = null;

const replaceModal = document.getElementById('replace-modal');
const originalPreview = document.getElementById('original-preview');
const newPreview = document.getElementById('new-preview');
const originalDims = document.getElementById('original-dims');
const newDims = document.getElementById('new-dims');
const replaceFileInput = document.getElementById('replace-file');
const replaceAltInput = document.getElementById('replace-alt');
const validationMessage = document.getElementById('validation-message');
const confirmReplaceBtn = document.getElementById('confirm-replace-btn');
const replaceForm = document.getElementById('replace-form');

function openReplaceModal(id, url) {
    currentReplaceId = id;
    currentOriginalUrl = url;
    
    // Reset modal state
    replaceForm.reset();
    newPreview.style.display = 'none';
    newPreview.src = '';
    newDims.textContent = '';
    validationMessage.textContent = '';
    confirmReplaceBtn.disabled = true;

    // Load original image to calculate its aspect ratio and dimensions
    originalPreview.src = url;
    originalPreview.onload = function() {
        const width = originalPreview.naturalWidth;
        const height = originalPreview.naturalHeight;
        originalAspectRatio = width / height;
        originalDims.textContent = `${width} x ${height} px`;
    };

    replaceModal.classList.remove('hidden');
}

function closeReplaceModal() {
    replaceModal.classList.add('hidden');
    currentReplaceId = null;
    currentOriginalUrl = null;
    originalAspectRatio = null;
}

// Validate Selected File
replaceFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
        newPreview.style.display = 'none';
        confirmReplaceBtn.disabled = true;
        validationMessage.textContent = '';
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    newPreview.src = objectUrl;
    newPreview.style.display = 'block';

    newPreview.onload = function() {
        const width = newPreview.naturalWidth;
        const height = newPreview.naturalHeight;
        const newAspectRatio = width / height;
        newDims.textContent = `${width} x ${height} px`;

        // Check compatibility (tolerance of 0.05 for floating point inaccuracies)
        const diff = Math.abs(newAspectRatio - originalAspectRatio);
        
        if (diff > 0.05) {
            validationMessage.textContent = '❌ Incompatible Aspect Ratio. Please select an image with a matching shape.';
            validationMessage.style.color = '#e74c3c';
            confirmReplaceBtn.disabled = true;
        } else {
            validationMessage.textContent = '✅ Image is compatible!';
            validationMessage.style.color = '#2ecc71';
            confirmReplaceBtn.disabled = false;
        }
    };
});

// Submit Replacement
replaceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (confirmReplaceBtn.disabled) return;

    const file = replaceFileInput.files[0];
    const altText = replaceAltInput.value;
    
    confirmReplaceBtn.disabled = true;
    confirmReplaceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Replacing...';

    try {
        // 1. Upload new image to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('gallery')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get new public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('gallery')
            .getPublicUrl(filePath);

        // 3. Update database record
        const { error: dbError } = await supabaseClient
            .from('photos')
            .update({ url: publicUrl, alt_text: altText })
            .eq('id', currentReplaceId);

        if (dbError) throw dbError;

        // 4. Try to delete the old image from Storage (if applicable)
        const oldUrlParts = currentOriginalUrl.split('/gallery/');
        if (oldUrlParts.length > 1) {
            const oldFilePath = oldUrlParts[1];
            await supabaseClient.storage.from('gallery').remove([oldFilePath]);
        }

        // Success
        closeReplaceModal();
        loadAdminGallery();

    } catch (error) {
        validationMessage.textContent = `Error: ${error.message}`;
        validationMessage.style.color = '#e74c3c';
        confirmReplaceBtn.disabled = false;
        confirmReplaceBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Confirm Replacement';
    }
});

// Init
checkAuth();
