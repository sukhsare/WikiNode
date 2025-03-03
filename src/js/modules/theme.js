/* theme.js */
// this file toggles dark/light mode using Font Awesome icons

// use Font Awesome icons (make sure you've added the Font Awesome stylesheet in your html head)
export const sunIcon = '<i class="fa-solid fa-sun"></i>'
export const moonIcon = '<i class="fa-solid fa-moon"></i>'

export function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle')
  const themeIconContainer = document.getElementById('theme-icon-container')
  if (!themeToggle || !themeIconContainer) return

  // set initial theme from localStorage
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

  // when the toggle is clicked, swap dark mode and update the icon
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
  // update the icon based on the current theme
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
