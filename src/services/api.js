const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },

  updateProfile: async (profileData) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (passwordData) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },
};

// Questions API
export const questionsAPI = {
  getQuestions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/questions${queryString ? `?${queryString}` : ''}`);
  },

  getQuestion: async (id) => {
    return apiRequest(`/questions/${id}`);
  },

  createQuestion: async (questionData) => {
    // Check if questionData is FormData (for file uploads)
    if (questionData instanceof FormData) {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/questions`;
      
      const config = {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: questionData,
      };

      try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }
        
        return data;
      } catch (error) {
        console.error('API Request Error:', error);
        throw error;
      }
    } else {
      // Regular JSON request
      return apiRequest('/questions', {
        method: 'POST',
        body: JSON.stringify(questionData),
      });
    }
  },



  voteQuestion: async (id, voteType) => {
    return apiRequest(`/questions/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    });
  },

  answerQuestion: async (id, answerData) => {
    return apiRequest(`/questions/${id}/answers`, {
      method: 'POST',
      body: JSON.stringify(answerData),
    });
  },

  voteAnswer: async (questionId, answerId, voteType) => {
    return apiRequest(`/questions/${questionId}/answers/${answerId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    });
  },
};

// Topics API
export const topicsAPI = {
  getTopics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/topics${queryString ? `?${queryString}` : ''}`);
  },

  getPopularTopics: async (limit = 10) => {
    return apiRequest(`/topics/popular?limit=${limit}`);
  },

  getTopic: async (slug) => {
    return apiRequest(`/topics/${slug}`);
  },
};

// Users API
export const usersAPI = {
  getTopUsers: async (limit = 10) => {
    return apiRequest(`/users/top?limit=${limit}`);
  },

  getUser: async (username) => {
    return apiRequest(`/users/${username}`);
  },

  getUserQuestions: async (username, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/users/${username}/questions${queryString ? `?${queryString}` : ''}`);
  },
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
};

export default {
  auth: authAPI,
  questions: questionsAPI,
  topics: topicsAPI,
  users: usersAPI,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
};