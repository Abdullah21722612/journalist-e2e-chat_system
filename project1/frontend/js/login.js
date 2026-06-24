document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Simple validation
    if (!username || !password) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
            
        });

        const data = await res.json().catch(() => ({}));

        // Step 2: If login failed, show error and stop
        if (!res.ok) {
            showAlert(data.message, 'error');
            return;
        }

        // Step 3: Login success — save user info
        showAlert(data.message, 'success');
        setCurrentUser(username);
        localStorage.setItem('currentUserId', data.id);
        localStorage.setItem('isLoggedIn', 'true');

        // Step 4: Get private key from server using same password
        const keyRes = await fetch(`${API_BASE_URL}/private-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.id, password })
        });

        if (!keyRes.ok) {
            showAlert('Failed to load private key.', 'error');
        return;
        }
        // Step 5: Save private key to localStorage
        const keyData = await keyRes.json();
        if (keyData.private_key) localStorage.setItem('privateKey', keyData.private_key);

        // Step 6: Go to dashboard
        setTimeout(() => navigateTo('dashboard.html'), 800);

    } catch (err) {
        // Something went wrong (no internet, server down, etc.)
        showAlert('Network error. Please try again.', 'error');
    }
});