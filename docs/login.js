document.getElementById('login-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  console.log('Login Request:', { username, password });

  try {
      const response = await fetch('/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
          const token = data.token.replace(/^"|"$/g, '');
          localStorage.setItem('token', token);
          console.log('JWT stored:', token);
          window.location.href = '/profile.html';
      } else {
          console.error('Login Error:', data.error);
          document.getElementById('login-message').textContent = `Error: ${data.error}`;
      }
  } catch (error) {
      console.error('Login Failed:', error.message);
      document.getElementById('login-message').textContent = `Error: ${error.message}`;
  }
});
