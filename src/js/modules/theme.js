export const sunIcon = '<i class="fa-solid fa-sun"></i>'
export const moonIcon = '<i class="fa-solid fa-moon"></i>'

export function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle')
  const themeIconContainer = document.getElementById('theme-icon-container')
  if (!themeToggle || !themeIconContainer) return

  // set initial theme from localstorage
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode')
    themeIconContainer.innerHTML = moonIcon
    themeIconContainer.classList.add('moon-icon')
    themeToggle.title = "Light Mode"
  } else {
    themeIconContainer.innerHTML = sunIcon
    themeIconContainer.classList.add('sun-icon')
    themeToggle.title = "Dark Mode"
  }

  // click listener to toggle dark mode and update icon
  themeToggle.addEventListener('click', () => {
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
  // update icon based on current theme
  const themeToggle = document.getElementById('theme-toggle')
  const themeIconContainer = document.getElementById('theme-icon-container')
  if (!themeToggle || !themeIconContainer) return

  if (document.body.classList.contains('dark-mode')) {
    themeIconContainer.innerHTML = moonIcon
    themeIconContainer.classList.remove('sun-icon')
    themeIconContainer.classList.add('moon-icon')
    themeToggle.title = "Light Mode"
  } else {
    themeIconContainer.innerHTML = sunIcon
    themeIconContainer.classList.remove('moon-icon')
    themeIconContainer.classList.add('sun-icon')
    themeToggle.title = "Dark Mode"
  }
}
