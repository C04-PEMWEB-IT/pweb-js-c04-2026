document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('userFirstName')) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const loadingSpinner = document.getElementById('loadingSpinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameVal = usernameInput.value.trim();
        const passwordVal = passwordInput.value.trim();

        // Reset error & aktifkan loading state
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
        setLoading(true);

        try {
            const response = await fetch('https://dummyjson.com/users');
            
            if (!response.ok) {
                throw new Error('Gagal terhubung ke server atau masalah jaringan.');
            }

            const data = await response.json();
            const users = data.users;

            const matchedUser = users.find(
                user => user.username === usernameVal && user.password === passwordVal
            );

            if (matchedUser) {
                localStorage.setItem('userFirstName', matchedUser.firstName);
                localStorage.setItem('userUsername', matchedUser.username);

                window.location.href = 'index.html';
            } else {
                throw new Error('Username atau password yang Anda masukkan salah.');
            }

        } catch (error) {
            showError(error.message || 'Terjadi kesalahan sistem. Silakan coba lagi.');
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.opacity = '0.7';
            loadingSpinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.style.opacity = '1';
            loadingSpinner.classList.add('hidden');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
});