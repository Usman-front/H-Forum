import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { questionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../utils/dateUtils';

const QuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState(null);
  const [votingAnswers, setVotingAnswers] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        const response = await questionsAPI.getQuestion(id);
        setQuestion(response.question);
        setAnswers(response.question.answers || []);
      } catch (err) {
        setError(err.message || 'Failed to load question');
        console.error('Error fetching question:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuestion();
    }
  }, [id]);



  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!newAnswer.trim()) {
      setAnswerError('Answer cannot be empty');
      return;
    }

    try {
      setSubmittingAnswer(true);
      setAnswerError(null);
      
      const response = await questionsAPI.answerQuestion(id, {
        content: newAnswer.trim()
      });
      
      // Add the new answer to the list
      setAnswers(prev => [...prev, response.answer]);
      setNewAnswer('');
    } catch (err) {
      setAnswerError(err.message || 'Failed to submit answer');
      console.error('Error submitting answer:', err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAnswerVote = async (answerId, voteType) => {
    console.log('Vote clicked:', { answerId, voteType, user: user ? 'authenticated' : 'not authenticated' });
    
    if (!user) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    // Find the answer to check if user is the author
    const answer = answers.find(a => a._id === answerId);
    if (answer && answer.author._id === user._id) {
      console.log('User cannot vote on their own answer');
      return;
    }

    if (votingAnswers.has(answerId)) {
      return; // Prevent multiple simultaneous votes
    }

    try {
      console.log('Setting voting state and making API call...');
      setVotingAnswers(prev => new Set([...prev, answerId]));
      
      const response = await questionsAPI.voteAnswer(id, answerId, voteType);
      console.log('Vote API response:', response);
      
      // Update the answer in the local state
      setAnswers(prev => prev.map(answer => {
        if (answer._id === answerId) {
          const updatedAnswer = { ...answer };
          
          // Reset votes
          if (!updatedAnswer.votes) {
            updatedAnswer.votes = { upvotes: [], downvotes: [] };
          }
          
          // Remove user from both arrays
          updatedAnswer.votes.upvotes = updatedAnswer.votes.upvotes.filter(userId => userId !== user._id);
          updatedAnswer.votes.downvotes = updatedAnswer.votes.downvotes.filter(userId => userId !== user._id);
          
          // Add user to appropriate array
          if (voteType === 'upvote') {
            updatedAnswer.votes.upvotes.push(user._id);
          } else {
            updatedAnswer.votes.downvotes.push(user._id);
          }
          
          return updatedAnswer;
        }
        return answer;
      }));
    } catch (err) {
      console.error('Error voting on answer:', err);
    } finally {
      setVotingAnswers(prev => {
        const newSet = new Set(prev);
        newSet.delete(answerId);
        return newSet;
      });
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Error Loading Question</h2>
            <p className="text-purple-200 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Question Not Found</h2>
            <button
              onClick={() => navigate('/')}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white rounded-xl">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-4 sm:mb-6 flex items-center space-x-2 text-purple-200 hover:text-white transition-colors cursor-pointer"
        >
          <span>←</span>
          <span className="text-sm sm:text-base">Back to Questions</span>
        </button>



        {/* Question */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 leading-tight">{question.title}</h1>
              
              <div className="prose prose-invert max-w-none mb-4 sm:mb-6">
                <p className="text-sm sm:text-base lg:text-lg leading-relaxed whitespace-pre-wrap">{question.description}</p>
              </div>

              {/* Attachments */}
              {question.attachments && question.attachments.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-purple-200">Attachments</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {question.attachments.map((attachment, index) => (
                      <div key={index} className="bg-white/5 rounded-lg overflow-hidden">
                        {attachment.mimetype.startsWith('image/') ? (
                          <div className="group cursor-pointer" onClick={() => setSelectedImage(attachment)}>
                            <img
                              src={`http://localhost:5000/uploads/${attachment.filename}`}
                              alt={attachment.originalName}
                              className="w-full h-48 object-cover group-hover:opacity-80 transition-opacity"
                            />
                            <div className="p-3">
                              <p className="text-sm text-white truncate">{attachment.originalName}</p>
                              <p className="text-xs text-purple-300">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                          </div>
                        ) : attachment.mimetype.startsWith('video/') ? (
                          <div>
                            <video
                              controls
                              className="w-full h-48 object-cover"
                              preload="metadata"
                            >
                              <source src={`http://localhost:5000/uploads/${attachment.filename}`} type={attachment.mimetype} />
                              Your browser does not support the video tag.
                            </video>
                            <div className="p-3">
                              <p className="text-sm text-white truncate">{attachment.originalName}</p>
                              <p className="text-xs text-purple-300">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <div className="text-4xl mb-2">📄</div>
                            <p className="text-sm text-white truncate">{attachment.originalName}</p>
                            <p className="text-xs text-purple-300 mb-2">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
                            <a
                              href={`http://localhost:5000/uploads/${attachment.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-300 hover:text-white text-sm underline"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                  {question.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-600/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Question Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-xs sm:text-sm text-purple-200">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <span>Asked by {question.author?.username || 'Anonymous'}</span>
                  <span>{formatDateTime(question.createdAt)}</span>
                  {question.topic && (
                    <Link
                      to={`/topic/${question.topic}`}
                      className="bg-blue-600/50 px-2 py-1 rounded text-xs hover:bg-blue-600/70 transition-colors self-start"
                    >
                      {question.topicName || question.topic}
                    </Link>
                  )}
                </div>
                <span className="font-medium">{answers.length} answer{answers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
        </div>

        {/* Answers Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6">
            {answers.length} Answer{answers.length !== 1 ? 's' : ''}
          </h2>
          
          {answers.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center">
              <p className="text-purple-200 text-sm sm:text-base lg:text-lg">No answers yet. Be the first to help!</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {answers.map((answer, index) => {
                const voteScore = (answer.votes?.upvotes?.length || 0) - (answer.votes?.downvotes?.length || 0);
                const userUpvoted = user && answer.votes?.upvotes?.includes(user._id);
                const userDownvoted = user && answer.votes?.downvotes?.includes(user._id);
                const isVoting = votingAnswers.has(answer._id);
                const isAnswerAuthor = user && answer.author._id === user._id;
                
                return (
                  <div key={answer._id || index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Vote Section */}
                      <div className="flex flex-col items-center space-y-1 sm:space-y-2 min-w-[50px] sm:min-w-[60px] flex-shrink-0">
                        <button
                          onClick={() => handleAnswerVote(answer._id, 'upvote')}
                          disabled={isVoting || !user || isAnswerAuthor}
                          className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                            userUpvoted
                              ? 'bg-green-600 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        <span className={`font-bold text-sm sm:text-base lg:text-lg ${
                          voteScore > 0 ? 'text-green-400' : 
                          voteScore < 0 ? 'text-red-400' : 'text-purple-200'
                        }`}>
                          {voteScore}
                        </span>
                        
                        <button
                          onClick={() => handleAnswerVote(answer._id, 'downvote')}
                          disabled={isVoting || !user || isAnswerAuthor}
                          className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                            userDownvoted
                              ? 'bg-red-600 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Answer Content */}
                      <div className="flex-1 min-w-0">
                        <div className="prose prose-invert max-w-none mb-3 sm:mb-4">
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{answer.content}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 text-xs sm:text-sm text-purple-200">
                          <span>Answered by {answer.author?.username || 'Anonymous'}</span>
                          <span>{formatDateTime(answer.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Answer Form */}
        {user ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Your Answer</h3>
            <form onSubmit={handleAnswerSubmit}>
              <div className="mb-4">
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-white-200 border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none text-sm sm:text-base"
                  placeholder="Write your answer here. Be helpful and provide detailed explanations."
                  required
                  minLength={10}
                  maxLength={5000}
                />
                <p className="text-xs text-purple-200 mt-1">
                  {newAnswer.length}/5000 characters (minimum 10)
                </p>
              </div>
              
              {answerError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {answerError}
                </div>
              )}
              
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base w-full sm:w-auto"
                disabled={submittingAnswer || newAnswer.length < 10}
              >
                {submittingAnswer ? 'Submitting...' : 'Post Answer'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center">
            <p className="text-purple-200 mb-4 text-sm sm:text-base">Please sign in to post an answer.</p>
            <Link
              to="/login"
              className="bg-purple-600 hover:bg-purple-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors inline-block text-sm sm:text-base"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors z-10"
            >
              ✕
            </button>
            <img
              src={`http://localhost:5000/uploads/${selectedImage.filename}`}
              alt={selectedImage.originalName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <p className="text-sm font-medium">{selectedImage.originalName}</p>
              <p className="text-xs opacity-75">{(selectedImage.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail;