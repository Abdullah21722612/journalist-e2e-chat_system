// Simple page navigation
function navigateTo(page) {
    window.location.href = page;
}

function goToDashboard() {
    navigateTo('dashboard.html');
}

function goToChat(username) {
    // Store selected user in localStorage
    localStorage.setItem('selectedUser', username);
    navigateTo('chat.html');
}

function goToFakeLogin() {
    alert('Fake Login Mode - Random credentials generated for security.');
    // Generate random username and password for fake login
    const fakeUsername = 'user_' + Math.random().toString(36).substr(2, 9);
    const fakePassword = 'pass_' + Math.random().toString(36).substr(2, 9);
    console.log('Fake credentials:', fakeUsername, fakePassword);
    // In real implementation, these would be sent to backend
    navigateTo('dashboard.html');
}

function logout() {
    localStorage.clear();
    navigateTo('index.html');
}

// Form validation
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function showAlert(message, type = 'info') {
    alert(message); // Simple alert for now
}

// Local storage helpers
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Get current user from storage
function getCurrentUser() {
    return getFromLocalStorage('currentUser');
}

// Set current user
function setCurrentUser(username) {
    saveToLocalStorage('currentUser', username);
}