document.addEventListener('DOMContentLoaded', function () {
  // Verificar si el video se carga correctamente
  const video = document.querySelector('.video-background video');
  const fallback = document.querySelector('.video-fallback');

  if (video) {
    video.addEventListener('error', function () {
      console.log('⚠️ Video no disponible, usando fallback');
      if (fallback) {
        fallback.style.display = 'block';
      }
    });

    video.addEventListener('loadeddata', function () {
      console.log('✅ Video cargado correctamente');
    });
  }
  const showLoginBtn = document.getElementById('show-login');
  const landingPage = document.getElementById('landing');
  const loginContainer = document.getElementById('login-container');
  const loginForm = document.getElementById('login-form');
  const loginButton = document.getElementById('login-button');
  const themeToggle = document.getElementById('theme-toggle');

  // Asegurar que los elementos existen
  if (
    !showLoginBtn ||
    !landingPage ||
    !loginContainer ||
    !loginForm ||
    !loginButton
  ) {
    console.error('Elementos del DOM no encontrados');
    return;
  }

  // 1. Mostrar el modal de login al hacer clic en el botón de la portada
  showLoginBtn.addEventListener('click', () => {
    console.log('Botón de login presionado');
    landingPage.style.opacity = '0';
    landingPage.style.visibility = 'hidden';
    landingPage.style.pointerEvents = 'none';
    loginContainer.classList.add('active');
  });

  // Toggle de tema
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.querySelector('i').textContent =
        newTheme === 'light' ? '🌙' : '☀️';
    });
  }

  // 2. Lógica de autenticación al enviar el formulario
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Resetear estados previos
    loginButton.classList.remove('success', 'error', 'loading');
    loginButton.disabled = false;

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Validar que los campos no estén vacíos
    if (!username.trim() || !password.trim()) {
      loginButton.classList.add('error');
      loginButton.textContent = 'Completa los campos';
      setTimeout(() => {
        loginButton.classList.remove('error');
        loginButton.textContent = 'Iniciar Sesión';
      }, 2000);
      return;
    }

    // Iniciar estado de carga
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    loginButton.textContent = 'Iniciando sesión...';

    try {
      // Enviar petición al backend
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      loginButton.classList.remove('loading');

      if (result.success) {
        // Login exitoso
        loginButton.classList.add('success');
        loginButton.textContent = '¡Bienvenido!';

        // Guardar información del usuario en localStorage
        const userData = {
          usuario: result.user.username || username,
          email: result.user.email || '',
          id: result.user.id || null,
          login_time: new Date().toISOString(),
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));

        console.log('Usuario autenticado:', userData);

        // Redirigir al dashboard después de un breve momento
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        // Error de login
        loginButton.classList.add('error');
        loginButton.textContent = result.message || 'Error de autenticación';

        setTimeout(() => {
          loginButton.classList.remove('error');
          loginButton.textContent = 'Iniciar Sesión';
          loginButton.disabled = false;
        }, 3000);
      }
    } catch (error) {
      // Error de red
      loginButton.classList.remove('loading');
      loginButton.classList.add('error');
      loginButton.textContent = 'Error de conexión';
      console.error('Error en la petición:', error);

      setTimeout(() => {
        loginButton.classList.remove('error');
        loginButton.textContent = 'Iniciar Sesión';
        loginButton.disabled = false;
      }, 3000);
    }
  });

  // 3. Efectos en los campos de entrada
  const inputFields = document.querySelectorAll('.form-input');
  inputFields.forEach((field) => {
    field.addEventListener('focus', function () {
      this.parentElement.style.transform = 'scale(1.02)';
    });

    field.addEventListener('blur', function () {
      this.parentElement.style.transform = 'scale(1)';
    });
  });

  // 4. Efecto de partículas (opcional para mayor interactividad)
  createFloatingParticles();
});

// Función para crear partículas flotantes
function createFloatingParticles() {
  const particleContainer = document.createElement('div');
  particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    `;
  document.body.appendChild(particleContainer);

  // Crear partículas cada cierto tiempo
  setInterval(() => {
    if (document.querySelectorAll('.particle').length < 15) {
      createParticle(particleContainer);
    }
  }, 2000);
}

function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: 100%;
        animation: floatUp ${8 + Math.random() * 4}s linear forwards;
    `;

  // Añadir la animación si no existe
  if (!document.getElementById('particle-animation')) {
    const style = document.createElement('style');
    style.id = 'particle-animation';
    style.textContent = `
            @keyframes floatUp {
                to {
                    transform: translateY(-100vh) translateX(${(Math.random() - 0.5) * 100}px);
                    opacity: 0;
                }
            }
        `;
    document.head.appendChild(style);
  }

  container.appendChild(particle);

  // Remover partícula después de la animación
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 12000);
}
