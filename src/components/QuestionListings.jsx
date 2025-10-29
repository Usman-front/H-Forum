import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { MessageSquare, ArrowUp, ArrowDown, Eye, Clock, User, Tag } from 'lucide-react';
import { questionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const QuestionListings = () => {
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const queryParams = {
          page: currentPage,
          limit: 10,
          sort: sortBy
        };
        
        // Add search query from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const searchQuery = urlParams.get('search');
        if (searchQuery) {
          queryParams.search = searchQuery;
        }
        
        // Add filters based on current route
        if (location.pathname === '/my-topics' && user) {
          queryParams.author = user.username;
        } else if (params.topicName) {
          queryParams.topic = params.topicName;
        }
        
        if (filterBy !== 'all') {
          queryParams.filter = filterBy;
        }
        
        const response = await questionsAPI.getQuestions(queryParams);
        setQuestions(response.questions || []);
        setTotalPages(response.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Failed to fetch questions');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [sortBy, filterBy, currentPage, location.pathname, location.search, params.topicName, user]);

  const handleVote = async (questionId, voteType) => {
    if (!user) {
      alert('Please login to vote');
      return;
    }
    
    try {
      // Find the current question to check user's existing vote
      const currentQuestion = questions.find(q => q._id === questionId);
      const userHasUpvoted = currentQuestion?.votes?.upvotes?.includes(user._id);
      const userHasDownvoted = currentQuestion?.votes?.downvotes?.includes(user._id);
      
      // Determine the actual vote type to send
      let actualVoteType = voteType;
      if ((voteType === 'upvote' && userHasUpvoted) || (voteType === 'downvote' && userHasDownvoted)) {
        actualVoteType = 'remove';
      }
      
      await questionsAPI.voteQuestion(questionId, actualVoteType);
      
      // Refresh questions after voting with all current parameters
      const queryParams = {
        page: currentPage,
        limit: 10,
        sort: sortBy
      };
      
      // Add search query from URL parameters
      const urlParams = new URLSearchParams(location.search);
      const searchQuery = urlParams.get('search');
      if (searchQuery) {
        queryParams.search = searchQuery;
      }
      
      // Add filters based on current route
      if (location.pathname === '/my-topics' && user) {
        queryParams.author = user.username;
      } else if (params.topicName) {
        queryParams.topic = params.topicName;
      }
      
      if (filterBy !== 'all') {
        queryParams.filter = filterBy;
      }
      
      const response = await questionsAPI.getQuestions(queryParams);
      setQuestions(response.questions || []);
    } catch (err) {
      console.error('Error voting on question:', err);
      alert('Failed to vote. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          {location.pathname === '/' ? 'Main Discussions' :
           location.pathname === '/my-topics' ? 'My Questions' : 
           params.topicName ? `${params.topicName} Questions` : 'Recent Questions'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          {location.pathname === '/' ? 'Discover and participate in community discussions' : 'Browse questions from our community'}
        </p>
      </div>



      <div className="space-y-4 sm:space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
              {params.topicName ? `No current posts for ${params.topicName.replace(/-/g, ' ')}` : 'No questions found'}
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              {params.topicName ? 'Be the first to start a discussion on this topic!' : 'Be the first to ask a question!'}
            </p>
          </div>
        ) : (
          questions.map((question) => (
            <div key={question._id} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3 sm:space-x-4">
                {/* Vote buttons */}
                <div className="flex flex-col items-center space-y-1 sm:space-y-2 flex-shrink-0">
                  <button 
                    onClick={() => handleVote(question._id, 'upvote')}
                    className={`flex items-center space-x-1 transition-colors cursor-pointer p-1 ${
                      user && question.votes?.upvotes?.includes(user._id) 
                        ? 'text-purple-600' 
                        : 'text-gray-500 hover:text-purple-600'
                    }`}
                    disabled={!user || question.author._id === user._id}
                  >
                    <ArrowUp size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-medium">
                    {question.votes ? (question.votes.upvotes?.length || 0) - (question.votes.downvotes?.length || 0) : 0}
                  </span>
                  <button 
                    onClick={() => handleVote(question._id, 'downvote')}
                    className={`flex items-center space-x-1 transition-colors cursor-pointer p-1 ${
                      user && question.votes?.downvotes?.includes(user._id) 
                        ? 'text-red-600' 
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                    disabled={!user || question.author._id === user._id}
                  >
                    <ArrowDown size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>
                
                {/* Question content */}
                <div className="flex-1 min-w-0">
                  <Link to={`/question/${question._id}`}>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 hover:text-purple-600 cursor-pointer mb-2 line-clamp-2">
                      {question.title}
                    </h2>
                  </Link>
                  
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-3">
                    {question.description && question.description.length > 150 
                      ? `${question.description.substring(0, 150)}...` 
                      : question.description}
                  </p>
                  
                  {/* Attachments indicator */}
                  {question.attachments && question.attachments.length > 0 && (
                    <div className="flex items-center space-x-2 mb-3 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{question.attachments.length} attachment{question.attachments.length !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                      {question.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          <Tag size={10} className="inline mr-1 sm:w-3 sm:h-3" />
                          {tag}
                        </span>
                      ))}
                      {question.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{question.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Question stats and author */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageSquare size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span>{question.answerCount || 0} answers</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                      <User size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span className="truncate max-w-20 sm:max-w-none">{question.author?.username || 'Anonymous'}</span>
                      <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{new Date(question.createdAt).toLocaleDateString()}</span>
                      <span className="sm:hidden">{new Date(question.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 sm:mt-8 space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>
          
          <span className="px-3 sm:px-4 py-2 text-gray-600 text-sm">
            <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
            <span className="sm:hidden">{currentPage}/{totalPages}</span>
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionListings;