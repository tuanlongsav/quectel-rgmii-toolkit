// Theme toggle with prefers-color-scheme as the default.
// Stored override wins, otherwise follow the OS preference live.

const html = document.querySelector('html');
const darkModeToggle = document.getElementById('darkModeToggle');

function applyTheme(theme) {
  if (theme === 'dark') {
    html.setAttribute('data-bs-theme', 'dark');
    if (darkModeToggle) darkModeToggle.textContent = 'Light Mode';
  } else {
    html.removeAttribute('data-bs-theme');
    if (darkModeToggle) darkModeToggle.textContent = 'Dark Mode';
  }
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

function preferredTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Boot: stored override, otherwise OS preference.
const storedTheme = localStorage.getItem('theme');
applyTheme(storedTheme || preferredTheme());

// Follow OS preference live (only when user has not explicitly chosen).
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}
