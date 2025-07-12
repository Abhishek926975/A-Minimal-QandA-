(() => {
    // Utilities
    function $(sel) { return document.querySelector(sel); }
    function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
    function generateId() {
      return Math.random().toString(36).substr(2, 9);
    }
    function saveState() {
      localStorage.setItem('stackit_state', JSON.stringify(state));
    }
    function loadState() {
      let s = localStorage.getItem('stackit_state');
      if (s) {
        try {
          const parsed = JSON.parse(s);
          parsed.questions.forEach(q => {
            q.createdAt = new Date(q.createdAt);
            q.answers.forEach(a => a.createdAt = new Date(a.createdAt));
          });
          return parsed;
        } catch {
          return null;
        }
      }
      return null;
    }
  
    // App state
    const state = loadState() || {
      currentUser: { id: 'user1', name: 'User Name' },
      questions: [],
      notifications: [],
      currentPage: 'home',
      currentQuestionId: null,
      filters: {
        sort: 'newest',
        search: '',
        tags: []
      },
      pagination: {
        page: 1,
        perPage: 5
      }
    };
  
    // Quill editors
    let askQuill = null;
    let answerQuill = null;
  
    // Notifications
    function addNotification(text) {
      state.notifications.push({
        id: generateId(),
        text,
        read: false,
        createdAt: new Date()
      });
      saveState();
    }
    function markNotificationsRead() {
      state.notifications.forEach(n => n.read = true);
      saveState();
    }
  
    // Router
    function route() {
      const hash = location.hash || '#home';
      const [page, param] = hash.substring(1).split('/');
      state.currentPage = page;
      if (page === 'detail' && param) {
        state.currentQuestionId = param;
      } else {
        state.currentQuestionId = null;
      }
      render();
    }
  
    // Render functions
    function render() {
      updateNavActive();
      updateNotificationUI();
      switch(state.currentPage) {
        case 'home': renderHome(); break;
        case 'ask': renderAsk(); break;
        case 'detail': renderDetail(state.currentQuestionId); break;
        default: renderHome(); break;
      }
    }
  
    // Update nav active
    function updateNavActive() {
      $all('nav a').forEach(a => a.classList.remove('active'));
      // FIXED: string must be quoted and use template literals
      const navLink = $(`#nav${capitalize(state.currentPage)}`);
      if (navLink) navLink.classList.add('active');
    }
  
    // Update notification UI
    function updateNotificationUI() {
      const count = state.notifications.filter(n => !n.read).length;
      const notifCountEl = $('#notificationCount');
      if (count > 0) {
        notifCountEl.textContent = count;
        notifCountEl.classList.add('visible');
      } else {
        notifCountEl.textContent = '';
        notifCountEl.classList.remove('visible');
      }
    }
  
    // Helpers
    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  
    function htmlEscape(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  
    // Pagination helpers
    function getFilteredQuestions() {
      let qs = [...state.questions];
      if (state.filters.search.trim()) {
        const s = state.filters.search.toLowerCase();
        qs = qs.filter(q => q.title.toLowerCase().includes(s) || q.description.toLowerCase().includes(s));
      }
      if (state.filters.sort === 'unanswered') {
        qs = qs.filter(q => q.answers.length === 0);
      }
      if (state.filters.sort === 'newest') {
        qs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return qs;
    }
  
    function renderPagination(totalItems, currentPage, perPage) {
      const totalPages = Math.ceil(totalItems / perPage);
      if (totalPages <= 1) return '';
  
      // FIXED: Template literals and quoted strings for HTML fragments
      let html = `<div class="pagination">`;
      if (currentPage > 1) {
        html += `<button class="page-btn" data-page="${currentPage-1}">&lt;</button>`;
      }
      for (let i=1; i<=totalPages; i++) {
        html += `<button class="page-btn${i===currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
      }
      if (currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${currentPage+1}">&gt;</button>`;
      }
      html += `</div>`;
      return html;
    }
  
    // Render home page
    function renderHome() {
      const app = $('#app');
      const filtered = getFilteredQuestions();
      const {page, perPage} = state.pagination;
      const start = (page - 1) * perPage;
      const paginated = filtered.slice(start, start + perPage);
  
      let html = `
        <div class="filters">
          <input type="search" id="searchInput" placeholder="Search questions..." value="${htmlEscape(state.filters.search)}" aria-label="Search questions" />
          <select id="sortSelect" aria-label="Sort questions">
            <option value="newest" ${state.filters.sort==='newest'?'selected':''}>Newest</option>
            <option value="unanswered" ${state.filters.sort==='unanswered'?'selected':''}>Unanswered</option>
          </select>
        </div>
        <section class="question-list" aria-label="Question List">
      `;
  
      if (paginated.length === 0) {
        // FIXED: quotes around string literal HTML
        html += `<p>No questions found.</p>`;
      } else {
        paginated.forEach(q => {
          html += `
            <article class="question-list-item" tabindex="0">
              <h3 class="question-title" data-id="${q.id}" role="link" tabindex="0">${htmlEscape(q.title)}</h3>
              <div class="question-preview">${q.description.length > 120 ? htmlEscape(q.description.slice(0,120)) + '...' : htmlEscape(q.description)}</div>
              <div class="question-meta">
                <span>${q.answers.length} Answer${q.answers.length !== 1 ? 's' : ''}</span>
                <span>Asked ${timeAgo(q.createdAt)}</span>
              </div>
            </article>
          `;
        });
      }
  
      html += renderPagination(filtered.length, page, perPage);
      html += '</section>';
      app.innerHTML = html;
  
      // Event listeners
      $('#searchInput').addEventListener('input', e => {
        state.filters.search = e.target.value;
        state.pagination.page = 1;
        saveState();
        render();
      });
  
      $('#sortSelect').addEventListener('change', e => {
        state.filters.sort = e.target.value;
        state.pagination.page = 1;
        saveState();
        render();
      });
  
      $all('.question-title').forEach(el => {
        el.addEventListener('click', () => {
          // FIXED: quotes around string, template literal syntax for hash
          location.hash = `#detail/${el.dataset.id}`;
        });
        el.addEventListener('keypress', e => {
          if (e.key === 'Enter') {
            location.hash = `#detail/${el.dataset.id}`;
          }
        });
      });
  
      $all('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = Number(btn.dataset.page);
          if (!isNaN(p)) {
            state.pagination.page = p;
            saveState();
            render();
          }
        });
      });
    }
  
    // Render ask page
    function renderAsk() {
      const app = $('#app');
      app.innerHTML = `
        <form id="askForm" class="ask-form" novalidate>
          <label for="questionTitle">Title</label>
          <input type="text" id="questionTitle" name="title" placeholder="Enter question title" required minlength="10" maxlength="150" aria-describedby="titleHelp" />
          <small id="titleHelp">Min 10 characters, max 150</small>
  
          <label for="questionDescription">Description</label>
          <div id="questionDescription" style="height: 200px;"></div>
  
          <label for="tagsInput">Tags (comma separated)</label>
          <input type="text" id="tagsInput" name="tags" placeholder="e.g. javascript, css, html" aria-describedby="tagsHelp" />
          <small id="tagsHelp">Add up to 5 tags, separated by commas.</small>
  
          <button type="submit" class="submit-btn">Post Your Question</button>
        </form>
      `;
  
      if (askQuill) {
        askQuill.setContents([{ insert: '\n' }]);
      } else {
        askQuill = new Quill('#questionDescription', {
          theme: 'snow',
          placeholder: 'Describe your question in detail...'
        });
      }
  
      const form = $('#askForm');
      const titleInput = $('#questionTitle');
      const tagsInput = $('#tagsInput');
  
      form.addEventListener('submit', e => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const description = askQuill.getText().trim();
        const descriptionHTML = askQuill.root.innerHTML.trim();
        const tagsRaw = tagsInput.value.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0,5) : [];
  
        if (title.length < 10) {
          alert('Title must be at least 10 characters.');
          return;
        }
        if (description.length < 10) {
          alert('Description must be at least 10 characters.');
          return;
        }
  
        const newQuestion = {
          id: generateId(),
          title,
          description: descriptionHTML,
          answers: [],
          tags,
          createdAt: new Date()
        };
        state.questions.unshift(newQuestion);
        addNotification(`Question "${title}" posted.`);
        saveState();
        location.hash = '#home';
      });
    }
  
    // Render detail page
    function renderDetail(id) {
      const app = $('#app');
      const question = state.questions.find(q => q.id === id);
      if (!question) {
        app.innerHTML = `<p>Question not found.</p>`;
        return;
      }
  
      let html = `
        <article class="question-detail" aria-label="Question Detail">
          <h2>${htmlEscape(question.title)}</h2>
          <div class="question-description">${question.description}</div>
          <div class="question-meta">
            <span>Asked ${timeAgo(question.createdAt)}</span>
            <span>${question.answers.length} Answer${question.answers.length !== 1 ? 's' : ''}</span>
          </div>
        </article>
  
        <section class="answers" aria-label="Answers">
          <h3>Answers</h3>
      `;
  
      if (question.answers.length === 0) {
        html += `<p>No answers yet.</p>`;
      } else {
        question.answers.forEach(a => {
          html += `
            <article class="answer" tabindex="0">
              <div class="answer-content">${a.content}</div>
              <div class="answer-meta">
                <span>By ${htmlEscape(a.userName)}</span>
                <span>${timeAgo(a.createdAt)}</span>
              </div>
            </article>
          `;
        });
      }
  
      html += `
        </section>
  
        <section class="answer-form-section" aria-label="Answer form">
          <h3>Your Answer</h3>
          <form id="answerForm" novalidate>
            <div id="answerEditor" style="height: 150px;"></div>
            <button type="submit" class="submit-btn">Submit Answer</button>
          </form>
        </section>
      `;
  
      app.innerHTML = html;
  
      if (answerQuill) {
        answerQuill.setContents([{ insert: '\n' }]);
      } else {
        answerQuill = new Quill('#answerEditor', {
          theme: 'snow',
          placeholder: 'Write your answer here...'
        });
      }
  
      const answerForm = $('#answerForm');
      answerForm.addEventListener('submit', e => {
        e.preventDefault();
        const contentText = answerQuill.getText().trim();
        const contentHTML = answerQuill.root.innerHTML.trim();
        if (contentText.length < 10) {
          alert('Answer must be at least 10 characters.');
          return;
        }
        question.answers.push({
          id: generateId(),
          content: contentHTML,
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          createdAt: new Date()
        });
        addNotification(`New answer added to "${question.title}".`);
        saveState();
        renderDetail(id);
      });
    }
  
    // Time ago helper
    function timeAgo(date) {
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      if (seconds < 60) return 'just now';
      const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
      ];
      for (const i of intervals) {
        const count = Math.floor(seconds / i.seconds);
        if (count >= 1) return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
      }
      return '';
    }
  
    // Initialization
    window.addEventListener('hashchange', route);
    window.addEventListener('load', () => {
      render();
    });
  
    // Notify on notification icon click
    $('#notificationIcon').addEventListener('click', () => {
      if (state.notifications.length === 0) {
        alert('No notifications');
        return;
      }
      // Show notifications in alert for simplicity
      alert(state.notifications.map(n => n.text).join('\n'));
      markNotificationsRead();
      updateNotificationUI();
    });
  })();
  