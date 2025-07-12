// Simple Theme Toggle
class ThemeToggle {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    this.applyTheme();
    this.setupToggle();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateToggleIcon();
    localStorage.setItem('theme', this.currentTheme);
  }

  updateToggleIcon() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
      toggleBtn.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
    }
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
  }

  setupToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }
}

// Initialize theme toggle
const themeToggle = new ThemeToggle();

// Avatar Upload Handler
class AvatarUpload {
  constructor() {
    this.init();
  }

  init() {
    const avatar = document.getElementById('userAvatar');
    const upload = document.getElementById('avatarUpload');
    
    if (avatar && upload) {
      avatar.addEventListener('click', () => upload.click());
      upload.addEventListener('change', (e) => this.handleUpload(e));
      this.loadSavedAvatar();
    }
  }

  handleUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        this.updateAvatar(imageData);
        localStorage.setItem('userAvatar', imageData);
      };
      reader.readAsDataURL(file);
    }
  }

  updateAvatar(src) {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = `<img src="${src}" alt="User Avatar" />`;
      avatar.classList.remove('blank-avatar');
    }
  }

  resetToBlank() {
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.innerHTML = '👤';
      avatar.classList.add('blank-avatar');
    }
  }

  loadSavedAvatar() {
    const saved = localStorage.getItem('userAvatar');
    if (saved) {
      this.updateAvatar(saved);
    } else {
      this.resetToBlank();
    }
  }
}

// Initialize avatar upload
const avatarUpload = new AvatarUpload();