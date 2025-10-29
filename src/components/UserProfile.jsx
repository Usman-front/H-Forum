import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { questionsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';

const UserProfile = () => {
  const { user } = useAuth();
  const [userQuestions, setUserQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    totalVotes: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Fetch user's questions
        const response = await questionsAPI.getQuestions({
          author: user.username,
          limit: 10,
          sort: 'recent'
        });
        
        setUserQuestions(response.questions || []);
        
        // Calculate stats
        const questions = response.questions || [];
        const totalAnswers = questions.reduce((sum, q) => sum + (q.answers?.length || 0), 0);
        const totalVotes = questions.reduce((sum, q) => {
          const upvotes = q.votes?.upvotes?.length || 0;
          const downvotes = q.votes?.downvotes?.length || 0;
          return sum + upvotes - downvotes;
        }, 0);
        
        setStats({
          totalQuestions: questions.length,
          totalAnswers,
          totalVotes
        });
      } catch (err) {
        setError(err.message || 'Failed to load profile data');
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 sm:py-8 px-2">
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm sm:text-base">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 sm:py-8 px-2">
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center">
          <p className="text-red-300 mb-4 text-sm sm:text-base">{error}</p>
          <Link to="/" className="bg-purple-600 hover:bg-purple-700 px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 sm:py-8 px-2">
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 lg:p-8 mb-50">
        {/* Profile Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-600 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{user?.username}</h1>
                <p className="text-purple-200 mb-2 text-sm sm:text-base">{user?.email}</p>
                <p className="text-xs sm:text-sm text-purple-300">Member since {formatDate(user?.createdAt)}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 mb-1 sm:mb-2">{user?.reputation || 0}</div>
            <div className="text-purple-200 text-xs sm:text-sm lg:text-base">Reputation</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400 mb-1 sm:mb-2">{stats.totalQuestions}</div>
            <div className="text-purple-200 text-xs sm:text-sm lg:text-base">Questions Asked</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mb-1 sm:mb-2">{stats.totalAnswers}</div>
            <div className="text-purple-200 text-xs sm:text-sm lg:text-base">Answers Received</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-400 mb-1 sm:mb-2">{stats.totalVotes}</div>
            <div className="text-purple-200 text-xs sm:text-sm lg:text-base">Total Votes</div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default UserProfile;