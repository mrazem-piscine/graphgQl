document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
  
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
  
    console.log('Login Request:', { username, password });
  
    try {
        const response = await fetch('https://adam-jerusalem.nd.edu/api/auth/signin', { 
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + btoa(`${username}:${password}`),
                'Content-Type': 'application/json',
            },
        });

        const token = await response.text();

        if (response.ok) {
            localStorage.setItem('token', token);
            console.log('JWT stored:', token);
            window.location.href = 'profile.html'; // Redirect to profile page
        } else {
            console.error('Login Error:', token);
            document.getElementById('login-message').textContent = `Error: ${token}`;
        }
    } catch (error) {
        console.error('Login Failed:', error.message);
        document.getElementById('login-message').textContent = `Error: ${error.message}`;
    }
});
