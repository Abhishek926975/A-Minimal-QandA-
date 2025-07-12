// StackIt Configuration
const STACKIT_CONFIG = {
  // App settings
  app: {
    name: 'StackIt',
    version: '1.0.0',
    maxQuestionTitleLength: 150,
    minQuestionTitleLength: 10,
    minDescriptionLength: 10,
    maxTagsPerQuestion: 5,
    questionsPerPage: 5
  },
  
  // User roles and permissions
  roles: {
    guest: ['view'],
    user: ['view', 'post', 'vote', 'comment'],
    admin: ['view', 'post', 'vote', 'comment', 'moderate', 'delete']
  },
  
  // Notification types
  notifications: {
    types: {
      ANSWER_POSTED: 'Someone answered your question',
      COMMENT_ADDED: 'Someone commented on your answer',
      MENTION: 'You were mentioned in a post',
      ANSWER_ACCEPTED: 'Your answer was accepted'
    }
  },
  
  // Rich text editor toolbar
  editorToolbar: [
    ['bold', 'italic', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
  
  // Available tags (can be extended)
  availableTags: [
    'javascript', 'python', 'java', 'react', 'nodejs', 'css', 'html',
    'angular', 'vue', 'php', 'sql', 'mongodb', 'express', 'django',
    'spring', 'bootstrap', 'jquery', 'typescript', 'aws', 'docker'
  ],
  
  // Sort options
  sortOptions: [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'unanswered', label: 'Unanswered' },
    { value: 'most-answers', label: 'Most Answers' }
  ]
};

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = STACKIT_CONFIG;
}