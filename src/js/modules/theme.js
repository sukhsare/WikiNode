export const sunIcon = '<i class="fa-solid fa-sun"></i>'
export const moonIcon = '<i class="fa-solid fa-moon"></i>'

export function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle')
  const iconContainer = document.getElementById('theme-icon-container')
  if (!toggleBtn || !iconContainer) return

  // set initial theme based on localStorage
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode')
    iconContainer.innerHTML = moonIcon
    iconContainer.classList.add('moon-icon')
    toggleBtn.title = "Light Mode"
  } else {
    iconContainer.innerHTML = sunIcon
    iconContainer.classList.add('sun-icon')
    toggleBtn.title = "Dark Mode"
  }

  // when user clicks the toggle, flip dark mode and update the icon
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode')
    updateThemeIcon()
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark')
    } else {
      localStorage.setItem('theme', 'light')
    }
  })
}

function updateThemeIcon() {
  const toggleBtn = document.getElementById('theme-toggle')
  const iconContainer = document.getElementById('theme-icon-container')
  if (!toggleBtn || !iconContainer) return

  if (document.body.classList.contains('dark-mode')) {
    iconContainer.innerHTML = moonIcon
    iconContainer.classList.remove('sun-icon')
    iconContainer.classList.add('moon-icon')
    toggleBtn.title = "Light Mode"
  } else {
    iconContainer.innerHTML = sunIcon
    iconContainer.classList.remove('moon-icon')
    iconContainer.classList.add('sun-icon')
    toggleBtn.title = "Dark Mode"
  }
}
