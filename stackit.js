(() => {
  // Utilities
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  // State management
  const state = {
    currentUser: { id: 'guest', name: 'Guest', role: 'guest' },
    isLoggedIn: false,
    questions: [],
    notifications: [],
    currentPage: 'home',
    currentQuestionId: null,
    filters: { sort: 'newest', search: '', tags: [] },
    pagination: { page: 1, perPage: 5 }
  };

  // Load/Save state
  function saveState() {
    localStorage.setItem('stackit_data', JSON.stringify(state));
  }

  function loadState() {
    const saved = localStorage.getItem('stackit_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        state.questions.forEach(q => {
          q.createdAt = new Date(q.createdAt);
          q.answers?.forEach(a => a.createdAt = new Date(a.createdAt));
        });
      } catch (e) {
        console.error('Failed to load state:', e);
      }
    }
  }

  // Quill editors
  let questionEditor = null;
  let answerEditor = null;

  // Notifications
  function addNotification(text, type = 'info') {
    state.notifications.unshift({
      id: generateId(),
      text,
      type,
      read: false,
      createdAt: new Date()
    });
    saveState();
    updateNotificationUI();
  }

  function markNotificationsRead() {
    state.notifications.forEach(n => n.read = true);
    saveState();
    updateNotificationUI();
  }

  // Router with URL params
  function route() {
    const hash = location.hash || '#home';
    const [page, param] = hash.substring(1).split('/');
    const urlParams = new URLSearchParams(location.search);
    
    state.currentPage = page;
    state.currentQuestionId = param || null;
    
    // Handle pagination from URL
    const pageNum = parseInt(urlParams.get('page')) || 1;
    if (pageNum !== state.pagination.page) {
      state.pagination.page = pageNum;
    }
    
    render();
  }

  function updateURL() {
    const baseUrl = location.pathname + location.hash;
    const params = new URLSearchParams();
    if (state.pagination.page > 1) {
      params.set('page', state.pagination.page);
    }
    const newUrl = baseUrl + (params.toString() ? '?' + params.toString() : '');
    history.replaceState(null, '', newUrl);
  }

  // Main render function
  function render() {
    updateNavigation();
    updateNotificationUI();
    updateUserDisplay();
    
    switch(state.currentPage) {
      case 'home': renderHome(); break;
      case 'ask': renderAskQuestion(); break;
      case 'answer': renderAnswerQuestions(); break;
      case 'detail': renderQuestionDetail(); break;
      case 'login': renderLogin(); break;
      case 'register': renderRegister(); break;
      case 'help': renderHelp(); break;
      default: renderHome();
    }
  }

  // Navigation updates
  function updateNavigation() {
    $$('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = $(`#nav${capitalize(state.currentPage)}`);
    if (activeLink) activeLink.classList.add('active');
  }

  function updateUserDisplay() {
    const userName = $('#userName');
    const loginLink = $('#navLogin');
    
    if (userName) userName.textContent = state.currentUser.name;
    if (loginLink) {
      loginLink.textContent = state.isLoggedIn ? 'Logout' : 'Login';
      loginLink.href = state.isLoggedIn ? '#logout' : '#login';
    }
  }

  function updateNotificationUI() {
    const unreadCount = state.notifications.filter(n => !n.read).length;
    const badge = $('#notificationCount');
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.add('visible');
    } else {
      badge.textContent = '';
      badge.classList.remove('visible');
    }
  }

  // Utility functions
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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
    
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }

  // Question filtering and pagination
  function getFilteredQuestions() {
    let questions = [...state.questions];
    
    if (state.filters.search.trim()) {
      const search = state.filters.search.toLowerCase().trim();
      questions = questions.filter(q => {
        const titleMatch = q.title.toLowerCase().includes(search);
        const descMatch = q.description.toLowerCase().includes(search);
        const tagMatch = q.tags.some(tag => tag.toLowerCase().includes(search));
        const authorMatch = q.authorName.toLowerCase().includes(search);
        
        return titleMatch || descMatch || tagMatch || authorMatch;
      });
    }
    
    switch(state.filters.sort) {
      case 'newest':
        questions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        questions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'unanswered':
        questions = questions.filter(q => q.answers.length === 0);
        break;
      case 'most-answers':
        questions.sort((a, b) => b.answers.length - a.answers.length);
        break;
    }
    
    return questions;
  }

  function renderPagination(totalItems) {
    const { page, perPage } = state.pagination;
    const totalPages = Math.ceil(totalItems / perPage);
    
    if (totalPages <= 1) return '';
    
    let html = '<div class="pagination">';
    
    if (page > 1) {
      html += `<button class="page-btn" data-page="${page - 1}">&lt;</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
      const active = i === page ? ' active' : '';
      html += `<button class="page-btn${active}" data-page="${i}">${i}</button>`;
    }
    
    if (page < totalPages) {
      html += `<button class="page-btn" data-page="${page + 1}">&gt;</button>`;
    }
    
    html += '</div>';
    return html;
  }

  // Render functions
  function renderHome() {
    const filtered = getFilteredQuestions();
    const { page, perPage } = state.pagination;
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    let html = `
      <div class="container">
        <div class="filters flex flex-wrap gap-3 p-4 bg-light rounded shadow">
          <div class="search-container flex-1">
            <div class="search-wrapper">
              <input type="text" id="searchInput" class="form-control" placeholder="🔍 Search questions or phrases..." 
                     value="${escapeHtml(state.filters.search)}" autocomplete="off" />
              <div id="searchSuggestions" class="search-suggestions hidden"></div>
            </div>
          </div>
          <select id="sortSelect" class="form-control" style="min-width: 150px;">
            ${STACKIT_CONFIG.sortOptions.map(opt => 
              `<option value="${opt.value}" ${state.filters.sort === opt.value ? 'selected' : ''}>${opt.label}</option>`
            ).join('')}
          </select>
        </div>
        <div class="question-list">
    `;

    if (paginated.length === 0) {
      html += '<div class="card text-center p-5"><p class="text-lg text-muted">No questions found. <a href="#ask" class="btn btn-primary">Ask the first question!</a></p></div>';
    } else {
      paginated.forEach(q => {
        const acceptedAnswer = q.answers.find(a => a.accepted);
        html += `
          <div class="card question-list-item animate-fade-in" data-id="${q.id}" style="cursor: pointer;">
            <h3 class="text-xl text-primary m-2">${escapeHtml(q.title)}</h3>
            <div class="text-muted p-2">${q.description.substring(0, 150)}...</div>
            <div class="flex flex-wrap gap-1 p-2">
              ${q.tags.map(tag => `<span class="tag bg-primary text-white p-1 rounded text-xs">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="flex justify-between items-center p-2 text-sm text-muted">
              <div class="flex gap-3">
                <span class="flex items-center gap-1">📝 ${q.answers.length}</span>
                ${acceptedAnswer ? '<span class="text-success flex items-center gap-1">✅ Solved</span>' : ''}
              </div>
              <span>${timeAgo(q.createdAt)}</span>
            </div>
          </div>
        `;
      });
    }

    html += renderPagination(filtered.length) + '</div></div>';
    $('#app').innerHTML = html;

    // Simple search functionality
    const searchInput = $('#searchInput');
    const searchSuggestions = $('#searchSuggestions');
    let searchTimeout;
    
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const query = e.target.value;
        state.filters.search = query;
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Show suggestions
        if (searchSuggestions && query.length > 0) {
          showSearchSuggestions(query);
        } else if (searchSuggestions) {
          hideSearchSuggestions();
        }
        
        // Debounced render
        searchTimeout = setTimeout(() => {
          state.pagination.page = 1;
          updateURL();
          saveState();
          renderHome();
        }, 500);
      });
      
      if (searchSuggestions) {
        searchInput.addEventListener('focus', () => {
          if (searchInput.value.length > 0) {
            showSearchSuggestions(searchInput.value);
          }
        });
        
        searchInput.addEventListener('blur', () => {
          setTimeout(() => hideSearchSuggestions(), 200);
        });
      }
    }
    
    function showSearchSuggestions(query) {
      const suggestions = getSuggestions(query);
      if (suggestions.length > 0) {
        searchSuggestions.innerHTML = suggestions.map(s => 
          `<div class="suggestion-item" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</div>`
        ).join('');
        searchSuggestions.classList.remove('hidden');
        
        // Add click handlers
        $$('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            const suggestion = item.dataset.suggestion;
            searchInput.value = suggestion;
            state.filters.search = suggestion;
            state.pagination.page = 1;
            updateURL();
            saveState();
            hideSearchSuggestions();
            renderHome(); // Direct call
          });
        });
      } else {
        hideSearchSuggestions();
      }
    }
    
    function hideSearchSuggestions() {
      searchSuggestions.classList.add('hidden');
    }
    
    function getSuggestions(query) {
      const lowerQuery = query.toLowerCase().trim();
      const suggestions = new Set();
      
      if (lowerQuery.length === 0) return [];
      
      // Get full question titles as suggestions
      state.questions.forEach(q => {
        const title = q.title.toLowerCase();
        if (title.includes(lowerQuery)) {
          suggestions.add(q.title);
        }
      });
      
      // Get phrase suggestions from question titles
      state.questions.forEach(q => {
        const words = q.title.toLowerCase().split(' ');
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = words.slice(i, i + 2).join(' ');
          if (phrase.includes(lowerQuery) && phrase.length > lowerQuery.length) {
            suggestions.add(phrase);
          }
        }
      });
      
      // Add tags as suggestions
      state.questions.forEach(q => {
        q.tags.forEach(tag => {
          if (tag.includes(lowerQuery)) {
            suggestions.add(tag);
          }
        });
      });
      
      // Add common programming phrases
      const commonPhrases = [
        'how to center a div',
        'javascript functions',
        'react components',
        'css flexbox',
        'html forms',
        'python loops',
        'java arrays',
        'algorithm complexity',
        'data structures',
        'binary search',
        'sorting algorithms',
        'dynamic programming'
      ];
      
      commonPhrases.forEach(phrase => {
        if (phrase.includes(lowerQuery)) {
          suggestions.add(phrase);
        }
      });
      
      return Array.from(suggestions).slice(0, 6);
    }

    $('#sortSelect')?.addEventListener('change', e => {
      state.filters.sort = e.target.value;
      state.pagination.page = 1;
      updateURL();
      saveState();
      renderHome(); // Direct call
    });

    $$('.question-list-item').forEach(item => {
      item.addEventListener('click', () => {
        location.hash = `#detail/${item.dataset.id}`;
      });
    });

    $$('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newPage = parseInt(btn.dataset.page);
        if (newPage) {
          state.pagination.page = newPage;
          updateURL();
          saveState();
          renderHome(); // Direct call
        }
      });
    });
  }

  function renderAskQuestion() {
    if (!state.isLoggedIn) {
      $('#app').innerHTML = '<div class="container"><div class="card text-center p-5"><p class="text-lg">Please <a href="#login" class="btn btn-primary">login</a> to ask a question.</p></div></div>';
      return;
    }

    $('#app').innerHTML = `
      <div class="container">
        <form class="card p-5 animate-fade-in" id="askForm" style="max-width: 800px; margin: 0 auto;">
          <h2 class="text-2xl text-center m-3">Ask a Question</h2>
          <div class="form-group">
            <label for="questionTitle" class="text-lg">Title</label>
            <input type="text" id="questionTitle" class="form-control" placeholder="What's your question?" required />
          </div>
          <div class="form-group">
            <label for="questionDescription" class="text-lg">Description</label>
            <div id="questionDescription" style="height: 200px;"></div>
          </div>
          <div class="form-group">
            <label for="tagsInput" class="text-lg">Tags (comma separated)</label>
            <input type="text" id="tagsInput" class="form-control" placeholder="javascript, react, css" />
          </div>
          <button type="submit" class="btn btn-success w-full p-3 text-lg">Post Question</button>
        </form>
      </div>
    `;

    // Initialize Quill editor
    questionEditor = new Quill('#questionDescription', {
      theme: 'snow',
      modules: {
        toolbar: STACKIT_CONFIG.editorToolbar
      },
      placeholder: 'Describe your question in detail...'
    });

    $('#askForm').addEventListener('submit', e => {
      e.preventDefault();
      
      const title = $('#questionTitle').value.trim();
      const description = questionEditor.root.innerHTML.trim();
      const tags = $('#tagsInput').value.split(',').map(t => t.trim().toLowerCase()).filter(t => t);

      if (title.length < STACKIT_CONFIG.app.minQuestionTitleLength) {
        alert(`Title must be at least ${STACKIT_CONFIG.app.minQuestionTitleLength} characters.`);
        return;
      }

      if (questionEditor.getText().trim().length < STACKIT_CONFIG.app.minDescriptionLength) {
        alert(`Description must be at least ${STACKIT_CONFIG.app.minDescriptionLength} characters.`);
        return;
      }

      const newQuestion = {
        id: generateId(),
        title,
        description,
        tags: tags.slice(0, STACKIT_CONFIG.app.maxTagsPerQuestion),
        answers: [],
        authorId: state.currentUser.id,
        authorName: state.currentUser.name,
        createdAt: new Date(),
        votes: 0
      };

      state.questions.unshift(newQuestion);
      addNotification(`Question "${title}" posted successfully!`, 'success');
      saveState();
      location.hash = '#home';
    });
  }

  function renderQuestionDetail() {
    const question = state.questions.find(q => q.id === state.currentQuestionId);
    
    if (!question) {
      $('#app').innerHTML = '<p>Question not found.</p>';
      return;
    }

    let html = `
      <div class="question-detail">
        <h2>${escapeHtml(question.title)}</h2>
        <div class="question-content">${question.description}</div>
        <div class="question-tags">
          ${question.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="question-meta">
          <span>Asked by ${escapeHtml(question.authorName)} ${timeAgo(question.createdAt)}</span>
        </div>
      </div>

      <div class="answer-section">
        <h3>${question.answers.length} Answer${question.answers.length !== 1 ? 's' : ''}</h3>
    `;

    if (question.answers.length === 0) {
      html += '<p>No answers yet. Be the first to answer!</p>';
    } else {
      question.answers.forEach(answer => {
        const isAccepted = answer.accepted;
        const canAccept = state.isLoggedIn && state.currentUser.id === question.authorId && !question.answers.some(a => a.accepted);
        
        const canEdit = state.isLoggedIn && state.currentUser.id === answer.authorId;
        const isVerified = answer.verified || false;
        html += `
          <div class="answer-item ${isAccepted ? 'accepted-answer' : ''}">
            <div class="vote-controls">
              <button class="vote-btn" data-answer-id="${answer.id}" data-vote="up">▲</button>
              <span class="vote-count">${answer.votes || 0}</span>
              <button class="vote-btn" data-answer-id="${answer.id}" data-vote="down">▼</button>
            </div>
            <div class="answer-content" id="answer-${answer.id}">${answer.content}</div>
            <div class="answer-meta">
              <span>By ${escapeHtml(answer.authorName)} ${timeAgo(answer.createdAt)}</span>
              ${isAccepted ? '<span>✅ Accepted</span>' : ''}
              ${isVerified ? '<span>🔒 Verified</span>' : ''}
            </div>
            <div class="answer-actions">
              ${canAccept ? `<button class="accept-btn" data-answer-id="${answer.id}">Accept Answer</button>` : ''}
              ${canEdit ? `<button class="edit-btn" data-answer-id="${answer.id}">Edit</button>` : ''}
              ${canEdit ? `<button class="delete-btn" data-answer-id="${answer.id}">Delete</button>` : ''}
              ${state.currentUser.role === 'admin' ? `<button class="verify-btn" data-answer-id="${answer.id}">${isVerified ? 'Unverify' : 'Verify'}</button>` : ''}
            </div>
          </div>
        `;
      });
    }

    if (state.isLoggedIn) {
      html += `
        <div class="answer-form">
          <h3>Your Answer</h3>
          <form id="answerForm">
            <div id="answerEditor" style="height: 150px;"></div>
            <button type="submit" class="submit-btn">Post Answer</button>
          </form>
        </div>
      `;
    } else {
      html += '<p><a href="#login">Login</a> to post an answer.</p>';
    }

    html += '</div>';
    $('#app').innerHTML = html;

    if (state.isLoggedIn) {
      answerEditor = new Quill('#answerEditor', {
        theme: 'snow',
        modules: { toolbar: STACKIT_CONFIG.editorToolbar },
        placeholder: 'Write your answer here...'
      });

      $('#answerForm')?.addEventListener('submit', e => {
        e.preventDefault();
        
        const content = answerEditor.root.innerHTML.trim();
        if (answerEditor.getText().trim().length < 10) {
          alert('Answer must be at least 10 characters.');
          return;
        }

        const newAnswer = {
          id: generateId(),
          content,
          authorId: state.currentUser.id,
          authorName: state.currentUser.name,
          createdAt: new Date(),
          votes: 0,
          accepted: false
        };

        // Check for mentions in answer
        detectMentions(answerEditor.getText(), state.currentUser.id);

        question.answers.push(newAnswer);
        // Notify question author
        if (question.authorId !== state.currentUser.id) {
          addNotification(`${state.currentUser.name} answered your question: "${question.title}"`, 'answer');
        }
        addNotification(`New answer posted to "${question.title}"`, 'success');
        saveState();
        renderQuestionDetail();
      });
    }

    // Vote handlers
    $$('.vote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.isLoggedIn) {
          alert('Please login to vote.');
          return;
        }
        
        const answerId = btn.dataset.answerId;
        const voteType = btn.dataset.vote;
        const answer = question.answers.find(a => a.id === answerId);
        
        if (answer) {
          answer.votes = (answer.votes || 0) + (voteType === 'up' ? 1 : -1);
          saveState();
          renderQuestionDetail();
        }
      });
    });

    // Accept answer handlers
    $$('.accept-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const answerId = btn.dataset.answerId;
        const answer = question.answers.find(a => a.id === answerId);
        
        if (answer) {
          answer.accepted = true;
          if (answer.authorId !== state.currentUser.id) {
            addNotification(`Your answer was accepted for "${question.title}"`, 'accepted');
          }
          addNotification(`Answer accepted for "${question.title}"`, 'success');
          saveState();
          renderQuestionDetail();
        }
      });
    });

    // Edit/Delete/Verify handlers
    $$('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const answerId = btn.dataset.answerId;
        const answer = question.answers.find(a => a.id === answerId);
        const contentDiv = $(`#answer-${answerId}`);
        
        if (answer && contentDiv) {
          contentDiv.innerHTML = `
            <div id="edit-${answerId}" style="height: 150px;"></div>
            <button class="save-edit-btn btn btn-success" data-answer-id="${answerId}">Save</button>
            <button class="cancel-edit-btn btn btn-secondary" data-answer-id="${answerId}">Cancel</button>
          `;
          
          const editQuill = new Quill(`#edit-${answerId}`, {
            theme: 'snow',
            modules: { toolbar: STACKIT_CONFIG.editorToolbar }
          });
          editQuill.root.innerHTML = answer.content;
          
          $(`.save-edit-btn[data-answer-id="${answerId}"]`).addEventListener('click', () => {
            answer.content = editQuill.root.innerHTML;
            saveState();
            renderQuestionDetail();
          });
          
          $(`.cancel-edit-btn[data-answer-id="${answerId}"]`).addEventListener('click', () => {
            renderQuestionDetail();
          });
        }
      });
    });

    $$('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this answer?')) {
          const answerId = btn.dataset.answerId;
          question.answers = question.answers.filter(a => a.id !== answerId);
          addNotification('Answer deleted successfully', 'info');
          saveState();
          renderQuestionDetail();
        }
      });
    });

    $$('.verify-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const answerId = btn.dataset.answerId;
        const answer = question.answers.find(a => a.id === answerId);
        
        if (answer) {
          answer.verified = !answer.verified;
          addNotification(`Answer ${answer.verified ? 'verified' : 'unverified'}`, 'success');
          saveState();
          renderQuestionDetail();
        }
      });
    });
  }

  function renderAnswerQuestions() {
    if (!state.isLoggedIn) {
      $('#app').innerHTML = '<div class="container"><div class="card text-center p-5"><p class="text-lg">Please <a href="#login" class="btn btn-primary">login</a> to answer questions.</p></div></div>';
      return;
    }

    const unansweredQuestions = state.questions.filter(q => q.answers.length === 0);
    const questionsWithFewAnswers = state.questions.filter(q => q.answers.length > 0 && q.answers.length < 3);
    const allQuestions = [...unansweredQuestions, ...questionsWithFewAnswers];

    let html = `
      <div class="container">
        <div class="card p-4 mb-4">
          <h2 class="text-2xl text-center mb-3">🤝 Help the Community</h2>
          <p class="text-center text-muted">Answer questions and share your knowledge!</p>
        </div>
        <div class="question-list">
    `;

    if (allQuestions.length === 0) {
      html += '<div class="card text-center p-5"><p class="text-lg text-muted">No questions need answers right now. Check back later!</p></div>';
    } else {
      allQuestions.forEach(q => {
        const isUnanswered = q.answers.length === 0;
        html += `
          <div class="card p-4 animate-fade-in">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-xl text-primary flex-1">${escapeHtml(q.title)}</h3>
              <span class="badge ${isUnanswered ? 'bg-danger' : 'bg-warning'} text-white p-1 rounded text-xs ml-2">
                ${isUnanswered ? 'No Answers' : `${q.answers.length} Answer${q.answers.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <div class="text-muted mb-3">${q.description.substring(0, 200)}...</div>
            <div class="flex flex-wrap gap-1 mb-3">
              ${q.tags.map(tag => `<span class="tag bg-primary text-white p-1 rounded text-xs">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">Asked by ${escapeHtml(q.authorName)} ${timeAgo(q.createdAt)}</span>
              <button class="btn btn-success btn-sm answer-btn" data-question-id="${q.id}">Answer This</button>
            </div>
          </div>
        `;
      });
    }

    html += '</div></div>';
    $('#app').innerHTML = html;

    // Add event listeners for answer buttons
    $$('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const questionId = btn.dataset.questionId;
        location.hash = `#detail/${questionId}`;
      });
    });
  }

  function renderLogin() {
    $('#app').innerHTML = `
      <div class="container">
        <form class="login-form" id="loginForm">
          <h2>Login to StackIt</h2>
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" required />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required />
          </div>
          <button type="submit" class="submit-btn">Login</button>
          <p class="text-center"><small>Demo: Enter any username and email to login</small></p>
          <p class="text-center">Don't have an account? <a href="#register">Register here</a></p>
        </form>
      </div>
    `;

    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      
      const username = $('#username').value.trim();
      const email = $('#email').value.trim();
      
      if (username && email) {
        state.currentUser = {
          id: generateId(),
          name: username,
          email,
          role: 'user'
        };
        state.isLoggedIn = true;
        addNotification(`Welcome back, ${username}!`, 'success');
        saveState();
        location.hash = '#home';
      }
    });
  }

  function renderRegister() {
    $('#app').innerHTML = `
      <div class="container">
        <form class="login-form" id="registerForm">
          <h2>Register for StackIt</h2>
          <div class="form-group">
            <label for="regUsername">Username</label>
            <input type="text" id="regUsername" required minlength="3" pattern="^[a-zA-Z].*" title="Username must start with a letter" />
          </div>
          <div class="form-group">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" required />
          </div>
          <div class="form-group">
            <label for="regPassword">Password</label>
            <input type="password" id="regPassword" required minlength="6" />
          </div>
          <button type="submit" class="submit-btn">Create Account</button>
          <p class="text-center">Already have an account? <a href="#login">Login here</a></p>
        </form>
      </div>
    `;

    $('#registerForm').addEventListener('submit', e => {
      e.preventDefault();
      
      const username = $('#regUsername').value.trim();
      const email = $('#regEmail').value.trim();
      const password = $('#regPassword').value;
      
      if (!/^[a-zA-Z]/.test(username)) {
        alert('Username must start with a letter');
        return;
      }
      
      if (username && email && password) {
        state.currentUser = {
          id: generateId(),
          name: username,
          email,
          role: 'user'
        };
        state.isLoggedIn = true;
        addNotification(`Welcome to StackIt, ${username}!`, 'success');
        saveState();
        location.hash = '#home';
      }
    });
  }

  // Event listeners
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  window.addEventListener('load', () => {
    loadState();
    route();
  });

  // Navigation handlers
  $('#navLogin')?.addEventListener('click', e => {
    if (state.isLoggedIn && e.target.textContent === 'Logout') {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        state.isLoggedIn = false;
        state.currentUser = { id: 'guest', name: 'Guest', role: 'guest' };
        addNotification('Logged out successfully', 'info');
        saveState();
        location.hash = '#home';
      }
    }
  });

  // Notification dropdown
  $('#notificationBtn')?.addEventListener('click', () => {
    const dropdown = $('#notificationDropdown');
    const list = $('#notificationList');
    
    if (state.notifications.length === 0) {
      list.innerHTML = '<li class="notification-item">No notifications</li>';
    } else {
      list.innerHTML = state.notifications.slice(0, 10).map(n => {
        const timeStr = timeAgo(n.createdAt);
        const icon = getNotificationIcon(n.type);
        return `
          <li class="notification-item ${n.read ? 'read' : 'unread'}">
            <div class="notification-content">
              <span class="notification-icon">${icon}</span>
              <div class="notification-text">${escapeHtml(n.text)}</div>
              <div class="notification-time">${timeStr}</div>
            </div>
          </li>
        `;
      }).join('');
    }
    
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      setTimeout(() => markNotificationsRead(), 1000);
    }
  });

  function getNotificationIcon(type) {
    const icons = {
      answer: '💬',
      comment: '💭', 
      mention: '👤',
      accepted: '✅',
      success: '🎉',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  // @mention detection
  function detectMentions(text, authorId) {
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex);
    if (mentions) {
      mentions.forEach(mention => {
        const username = mention.substring(1);
        // In a real app, you'd look up user by username
        if (username !== state.currentUser.name && authorId !== state.currentUser.id) {
          addNotification(`${state.currentUser.name} mentioned you in a post`, 'mention');
        }
      });
    }
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#notificationBtn') && !e.target.closest('#notificationDropdown')) {
      $('#notificationDropdown')?.classList.add('hidden');
    }
  });

  function renderHelp() {
    $('#app').innerHTML = `
      <div class="container">
        <div class="card p-5">
          <h2 class="text-2xl text-center mb-4">📚 Help & Guide</h2>
          
          <div class="help-section">
            <h3>🚀 Getting Started</h3>
            <ul>
              <li><strong>Register:</strong> Create an account to ask questions and post answers</li>
              <li><strong>Ask Questions:</strong> Use clear titles and detailed descriptions</li>
              <li><strong>Answer Questions:</strong> Help others by sharing your knowledge</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>✨ Features</h3>
            <ul>
              <li><strong>Rich Text Editor:</strong> Format your questions and answers with bold, italic, lists, and code</li>
              <li><strong>Tags:</strong> Categorize questions with relevant tags</li>
              <li><strong>Voting:</strong> Upvote/downvote answers to show quality</li>
              <li><strong>Accept Answers:</strong> Mark the best answer to your question</li>
              <li><strong>Notifications:</strong> Get notified when someone answers your question</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>🔧 Answer Management</h3>
            <ul>
              <li><strong>Edit:</strong> You can edit your own answers anytime</li>
              <li><strong>Delete:</strong> Remove your answers if needed</li>
              <li><strong>Verification:</strong> Admins can verify high-quality answers</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>🎨 Customization</h3>
            <ul>
              <li><strong>Dark Mode:</strong> Toggle between light and dark themes</li>
              <li><strong>Profile Photo:</strong> Click your avatar to upload a custom photo</li>
              <li><strong>Search:</strong> Find questions using the search bar</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Use specific titles for better searchability</li>
              <li>Include code examples when relevant</li>
              <li>Tag questions appropriately</li>
              <li>Vote on answers to help the community</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // Sample data for demo
  if (state.questions.length === 0) {
    state.questions = [
      {
        id: 'demo1',
        title: 'How to center a div in CSS?',
        description: '<p>I\'ve been trying to center a div both horizontally and vertically. What\'s the best modern approach?</p>',
        tags: ['css', 'html', 'flexbox'],
        answers: [
          {
            id: 'ans1',
            content: '<p>Use Flexbox! It\'s the most reliable method:</p><pre>display: flex;\njustify-content: center;\nalign-items: center;</pre>',
            authorId: 'demo-user',
            authorName: 'CSS Expert',
            createdAt: new Date(Date.now() - 3600000),
            votes: 5,
            accepted: true
          }
        ],
        authorId: 'demo-author',
        authorName: 'New Developer',
        createdAt: new Date(Date.now() - 7200000),
        votes: 3
      },
      {
        id: 'demo2',
        title: 'What is the difference between let and var in JavaScript?',
        description: '<p>I keep hearing about let vs var but don\'t understand the practical differences. Can someone explain?</p>',
        tags: ['javascript', 'variables', 'es6'],
        answers: [],
        authorId: 'demo-author2',
        authorName: 'JS Learner',
        createdAt: new Date(Date.now() - 5400000),
        votes: 1
      },
      {
        id: 'demo3',
        title: 'How to make API calls in React?',
        description: '<p>I\'m new to React and need to fetch data from an API. What\'s the best way to do this?</p>',
        tags: ['react', 'api', 'fetch'],
        answers: [],
        authorId: 'demo-author3',
        authorName: 'React Beginner',
        createdAt: new Date(Date.now() - 1800000),
        votes: 2
      },
      {
        id: 'demo4',
        title: 'What is the difference between == and === in JavaScript?',
        description: '<p>I keep seeing both == and === operators in JavaScript code. What\'s the difference and when should I use each one?</p>',
        tags: ['javascript', 'operators', 'comparison'],
        answers: [],
        authorId: 'demo-author4',
        authorName: 'JS Student',
        createdAt: new Date(Date.now() - 3600000),
        votes: 3
      },
      {
        id: 'demo5',
        title: 'How do arrays work in programming?',
        description: '<p>I\'m learning programming and confused about arrays. What are they and how do I use them?</p>',
        tags: ['arrays', 'fundamentals', 'data-structures'],
        answers: [
          {
            id: 'ans2',
            content: '<p>Arrays are collections of elements stored in contiguous memory locations. Think of them like a list:</p><pre>let fruits = ["apple", "banana", "orange"];</pre><p>You can access elements by index: fruits[0] returns "apple"</p>',
            authorId: 'teacher1',
            authorName: 'Code Teacher',
            createdAt: new Date(Date.now() - 1800000),
            votes: 4,
            accepted: false
          }
        ],
        authorId: 'demo-author5',
        authorName: 'Programming Newbie',
        createdAt: new Date(Date.now() - 7200000),
        votes: 5
      },
      {
        id: 'demo6',
        title: 'What are functions and why do we use them?',
        description: '<p>I see functions everywhere in code but don\'t understand their purpose. Can someone explain functions in simple terms?</p>',
        tags: ['functions', 'fundamentals', 'programming'],
        answers: [],
        authorId: 'demo-author6',
        authorName: 'Coding Beginner',
        createdAt: new Date(Date.now() - 5400000),
        votes: 2
      },
      {
        id: 'demo7',
        title: 'How do loops work in programming?',
        description: '<p>I need to understand for loops and while loops. When should I use each type?</p>',
        tags: ['loops', 'for-loop', 'while-loop', 'fundamentals'],
        answers: [],
        authorId: 'demo-author7',
        authorName: 'Loop Learner',
        createdAt: new Date(Date.now() - 2700000),
        votes: 1
      },
      {
        id: 'demo8',
        title: 'What is the difference between null and undefined?',
        description: '<p>In JavaScript, I see both null and undefined values. What\'s the difference between them?</p>',
        tags: ['javascript', 'null', 'undefined', 'data-types'],
        answers: [
          {
            id: 'ans3',
            content: '<p><strong>undefined</strong> means a variable has been declared but not assigned a value.</p><p><strong>null</strong> is an intentional absence of value - you explicitly set it.</p><pre>let a; // undefined\nlet b = null; // null</pre>',
            authorId: 'expert1',
            authorName: 'JS Expert',
            createdAt: new Date(Date.now() - 900000),
            votes: 6,
            accepted: true
          }
        ],
        authorId: 'demo-author8',
        authorName: 'JS Explorer',
        createdAt: new Date(Date.now() - 4500000),
        votes: 4
      },
      {
        id: 'demo9',
        title: 'How do I debug my code effectively?',
        description: '<p>My code has bugs and I don\'t know how to find them. What are the best debugging techniques for beginners?</p>',
        tags: ['debugging', 'troubleshooting', 'best-practices'],
        answers: [],
        authorId: 'demo-author9',
        authorName: 'Debug Seeker',
        createdAt: new Date(Date.now() - 1200000),
        votes: 3
      },
      {
        id: 'dsa1',
        title: 'What is Big O notation and why is it important?',
        description: '<p>I keep hearing about Big O notation in algorithm discussions. Can someone explain what it means and why it matters?</p>',
        tags: ['big-o', 'algorithms', 'complexity', 'dsa'],
        answers: [],
        authorId: 'algo-student1',
        authorName: 'Algorithm Student',
        createdAt: new Date(Date.now() - 6300000),
        votes: 7
      },
      {
        id: 'dsa2',
        title: 'How do I implement a binary search algorithm?',
        description: '<p>I need to understand binary search. How does it work and how do I implement it in code?</p>',
        tags: ['binary-search', 'algorithms', 'searching', 'dsa'],
        answers: [
          {
            id: 'dsa-ans1',
            content: '<p>Binary search works on sorted arrays by repeatedly dividing the search space in half:</p><pre>function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    let mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}</pre>',
            authorId: 'algo-expert1',
            authorName: 'Algorithm Expert',
            createdAt: new Date(Date.now() - 2100000),
            votes: 12,
            accepted: true
          }
        ],
        authorId: 'search-learner',
        authorName: 'Search Learner',
        createdAt: new Date(Date.now() - 8100000),
        votes: 9
      },
      {
        id: 'dsa3',
        title: 'What are the different types of sorting algorithms?',
        description: '<p>I\'m confused about sorting algorithms. What are the main types and when should I use each one?</p>',
        tags: ['sorting', 'algorithms', 'bubble-sort', 'merge-sort', 'dsa'],
        answers: [],
        authorId: 'sort-student',
        authorName: 'Sort Student',
        createdAt: new Date(Date.now() - 4500000),
        votes: 5
      },
      {
        id: 'dsa4',
        title: 'How do linked lists work and when should I use them?',
        description: '<p>I understand arrays but linked lists are confusing. How are they different and what are their advantages?</p>',
        tags: ['linked-lists', 'data-structures', 'pointers', 'dsa'],
        answers: [],
        authorId: 'ds-learner',
        authorName: 'Data Structure Learner',
        createdAt: new Date(Date.now() - 3300000),
        votes: 6
      },
      {
        id: 'dsa5',
        title: 'What is the difference between stack and queue?',
        description: '<p>Both stack and queue seem similar to me. What\'s the key difference and when do I use each?</p>',
        tags: ['stack', 'queue', 'data-structures', 'lifo', 'fifo', 'dsa'],
        answers: [
          {
            id: 'dsa-ans2',
            content: '<p><strong>Stack</strong> is LIFO (Last In, First Out) - like a stack of plates.</p><p><strong>Queue</strong> is FIFO (First In, First Out) - like a line at a store.</p><p>Use stack for: function calls, undo operations, expression evaluation.</p><p>Use queue for: task scheduling, breadth-first search, handling requests.</p>',
            authorId: 'ds-expert',
            authorName: 'Data Structure Expert',
            createdAt: new Date(Date.now() - 1500000),
            votes: 8,
            accepted: false
          }
        ],
        authorId: 'queue-student',
        authorName: 'Queue Student',
        createdAt: new Date(Date.now() - 5700000),
        votes: 4
      },
      {
        id: 'dsa6',
        title: 'How do I solve dynamic programming problems?',
        description: '<p>Dynamic programming seems really hard. What\'s the approach to tackle DP problems step by step?</p>',
        tags: ['dynamic-programming', 'dp', 'algorithms', 'optimization', 'dsa'],
        answers: [],
        authorId: 'dp-student',
        authorName: 'DP Student',
        createdAt: new Date(Date.now() - 2400000),
        votes: 8
      },
      {
        id: 'dsa7',
        title: 'What are hash tables and how do they work?',
        description: '<p>I hear hash tables are very fast for lookups. How do they achieve O(1) time complexity?</p>',
        tags: ['hash-tables', 'hashing', 'data-structures', 'time-complexity', 'dsa'],
        answers: [],
        authorId: 'hash-learner',
        authorName: 'Hash Learner',
        createdAt: new Date(Date.now() - 1800000),
        votes: 3
      },
      {
        id: 'dsa8',
        title: 'How do I implement a binary tree traversal?',
        description: '<p>I need to understand tree traversals - inorder, preorder, and postorder. How are they different?</p>',
        tags: ['binary-tree', 'tree-traversal', 'recursion', 'data-structures', 'dsa'],
        answers: [],
        authorId: 'tree-student',
        authorName: 'Tree Student',
        createdAt: new Date(Date.now() - 3900000),
        votes: 6
      }
    ];
    saveState();
  }
})();