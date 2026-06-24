document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const messageEl = document.getElementById('message');

    if (messageEl) messageEl.innerText = '';
    
    // Validation
    if (!username || !password || !confirmPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    if (username.length < 3) {
        showAlert('Username must be at least 3 characters long.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json().catch(() => ({}));
        const message = data.message || 'Registration response received.';

        if (response.ok) {
            showAlert(message, 'success');
            if (messageEl) messageEl.innerText = message;
            setTimeout(() => navigateTo('index.html'), 800);
        } else {
            showAlert(message, 'error');
            if (messageEl) messageEl.innerText = message;
        }

    } catch (err) {
        showAlert('Network error. Please try again.', 'error');
        if (messageEl) messageEl.innerText = 'Network error. Please try again.';
    }
});