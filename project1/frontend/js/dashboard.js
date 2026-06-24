const currentUser = getCurrentUser();

document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) return navigateTo('index.html');
    loadUsers();
    
});

async function fetchUsers() {
    const { users = [] } = await fetch(`${API_BASE_URL}/all-users`).then(r => r.json());
    return users.filter(u => u.username !== currentUser);
}

function renderUsers(users) {
    const list = document.getElementById('usersList');
    if (!users.length) return list.innerHTML = '<p>No users found</p>';
    list.innerHTML = users.map(u => {
        const id = u.user_id ?? u.id ?? '';
        return `
            <div class="user-card">
                <h4>${u.username}</h4>
                <button class="btn btn-primary" onclick="startChat('${id}', '${u.username}')">Chat</button>
            </div>`;
    }).join('');
}

async function loadUsers(query = '') {
    const users = await fetchUsers();
    renderUsers(query ? users.filter(u => u.username.toLowerCase().includes(query)) : users);
}

function searchUsers() {
    const query = document.getElementById('searchUser').value.toLowerCase();
    loadUsers(query);
}

function startChat(userId, username) {
    localStorage.setItem('chatUserId', userId);
    localStorage.setItem('chatUsername', username);
    window.location.href = 'chat.html';
}