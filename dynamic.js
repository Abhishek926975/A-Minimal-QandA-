// Dynamic Design System Controller
class DynamicDesign {
  constructor() {
    this.themes = ['light', 'dark', 'high-contrast'];
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.fontSize = parseInt(localStorage.getItem('fontSize')) || 16;
    this.animations = localStorage.getItem('animations') !== 'false';
    this.init();
  }

  init() {
    this.applyTheme();
    this.createControls();
    this.setupResponsive();
    this.setupAnimations();
    this.detectSystemPreferences();
  }

  // Theme Management
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    document.documentElement.style.setProperty('--font-size', `${this.fontSize}px`);
    localStorage.setItem('theme', this.currentTheme);
    localStorage.setItem('fontSize', this.fontSize);
  }

  toggleTheme() {
    const currentIndex = this.themes.indexOf(this.currentTheme);
    this.currentTheme = this.themes[(currentIndex + 1) % this.themes.length];
    this.applyTheme();
    this.showNotification(`Theme changed to ${this.currentTheme}`);
  }

  // Dynamic Controls
  createControls() {
    const controls = document.createElement('div');
    controls.className = 'design-controls';
    controls.innerHTML = `
      <button class="theme-toggle" title="Toggle Theme">🎨</button>
      <div class="control-panel hidden">
        <div class="control-group">
          <label>Theme:</label>
          <select id="themeSelect">
            ${this.themes.map(t => `<option value="${t}" ${t === this.currentTheme ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <label>Font Size:</label>
          <input type="range" id="fontSizeSlider" min="12" max="24" value="${this.fontSize}">
          <span id="fontSizeValue">${this.fontSize}px</span>
        </div>
        <div class="control-group">
          <label>
            <input type="checkbox" id="animationsToggle" ${this.animations ? 'checked' : ''}>
            Enable Animations
          </label>
        </div>
      </div>
    `;
    
    document.body.appendChild(controls);
    this.setupControlEvents();
  }

  setupControlEvents() {
    const themeToggle = document.querySelector('.theme-toggle');
    const controlPanel = document.querySelector('.control-panel');
    const themeSelect = document.getElementById('themeSelect');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const animationsToggle = document.getElementById('animationsToggle');

    themeToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('hidden');
    });

    themeSelect.addEventListener('change', (e) => {
      this.currentTheme = e.target.value;
      this.applyTheme();
    });

    fontSizeSlider.addEventListener('input', (e) => {
      this.fontSize = parseInt(e.target.value);
      fontSizeValue.textContent = `${this.fontSize}px`;
      this.applyTheme();
    });

    animationsToggle.addEventListener('change', (e) => {
      this.animations = e.target.checked;
      localStorage.setItem('animations', this.animations);
      document.documentElement.style.setProperty('--transition', this.animations ? 'all 0.3s ease' : 'none');
    });
  }

  // Responsive Design
  setupResponsive() {
    const updateLayout = () => {
      const width = window.innerWidth;
      const root = document.documentElement;
      
      if (width < 768) {
        root.style.setProperty('--spacing', '0.75rem');
        root.style.setProperty('--radius', '6px');
      } else if (width > 1200) {
        root.style.setProperty('--spacing', '1.25rem');
        root.style.setProperty('--radius', '10px');
      } else {
        root.style.setProperty('--spacing', '1rem');
        root.style.setProperty('--radius', '8px');
      }
    };

    window.addEventListener('resize', updateLayout);
    updateLayout();
  }

  // Animation System
  setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    });

    // Observe elements as they're added
    const observeNewElements = () => {
      document.querySelectorAll('.card, .question-list-item, .answer-item').forEach(el => {
        if (!el.classList.contains('animate-fade-in')) {
          observer.observe(el);
        }
      });
    };

    // Initial observation
    setTimeout(observeNewElements, 100);
    
    // Re-observe when content changes
    const contentObserver = new MutationObserver(observeNewElements);
    contentObserver.observe(document.getElementById('app'), { childList: true, subtree: true });
  }

  // System Preferences
  detectSystemPreferences() {
    // Dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme')) {
      this.currentTheme = 'dark';
      this.applyTheme();
    }

    // Reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.animations = false;
      localStorage.setItem('animations', 'false');
    }

    // High contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.currentTheme = 'high-contrast';
      this.applyTheme();
    }
  }

  // Dynamic Component Creation
  createComponent(type, props = {}) {
    const element = document.createElement(props.tag || 'div');
    element.className = this.getComponentClasses(type, props);
    
    if (props.content) element.innerHTML = props.content;
    if (props.onclick) element.addEventListener('click', props.onclick);
    
    return element;
  }

  getComponentClasses(type, props) {
    const baseClasses = {
      card: 'card animate-fade-in',
      button: 'btn',
      input: 'form-control',
      grid: 'grid',
      flex: 'flex items-center gap-2'
    };

    let classes = baseClasses[type] || '';
    
    if (props.variant) classes += ` ${type}-${props.variant}`;
    if (props.size) classes += ` ${type}-${props.size}`;
    if (props.className) classes += ` ${props.className}`;
    
    return classes;
  }

  // Utility Methods
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification bg-${type} text-white p-3 rounded shadow-lg animate-slide-in`;
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      z-index: 1001;
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Dynamic Styling
  updateColors(colorScheme) {
    const root = document.documentElement;
    Object.entries(colorScheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }

  // Performance Optimization
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Enhanced StackIt with Dynamic Design
const dynamicDesign = new DynamicDesign();

// Extend existing StackIt functionality
if (typeof window.stackitApp !== 'undefined') {
  // Enhance existing app with dynamic features
  const originalRender = window.stackitApp.render;
  window.stackitApp.render = function() {
    originalRender.call(this);
    // Add dynamic classes to new elements
    setTimeout(() => {
      document.querySelectorAll('.question-list-item').forEach(item => {
        item.classList.add('card', 'animate-fade-in');
      });
      document.querySelectorAll('button').forEach(btn => {
        if (!btn.classList.contains('btn')) {
          btn.classList.add('btn', 'btn-primary');
        }
      });
    }, 50);
  };
}

// CSS for dynamic controls
const controlStyles = document.createElement('style');
controlStyles.textContent = `
  .design-controls {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 1000;
  }
  
  .control-panel {
    position: absolute;
    bottom: 70px;
    right: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--spacing);
    box-shadow: 0 4px 12px var(--shadow);
    min-width: 250px;
    transition: var(--transition);
  }
  
  .control-panel.hidden {
    display: none;
  }
  
  .control-group {
    margin-bottom: 1rem;
  }
  
  .control-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text);
  }
  
  .control-group select,
  .control-group input[type="range"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
  }
  
  .notification {
    animation: slideIn 0.3s ease-out;
  }
`;

document.head.appendChild(controlStyles);