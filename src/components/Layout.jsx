import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import { Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [topUsers, setTopUsers] = useState([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Auto-search functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      } else if (location.pathname === '/' && location.search.includes('search=')) {
        // Clear search results and show all discussions when search is cleared
        navigate('/');
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timeoutId);
  }, [searchQuery, navigate, location.pathname, location.search]);



  const sidebarItems = [
    { name: 'HOME', path: '/', active: true },
    { name: 'EXPLORE TOPICS', path: '/explore-topics' },
    { name: 'RECENT TOPICS', path: '/recent' },
    { name: 'MY TOPICS', path: '/my-topics' }
  ];

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const response = await usersAPI.getTopUsers(7);
        setTopUsers(response.users || []);
      } catch (err) {
        console.error('Error fetching top users:', err);
      }
    };

    fetchTopUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <Link 
              to="/" 
              className="text-xl sm:text-2xl font-bold text-purple-600 cursor-pointer"
              onClick={() => navigate('/')}
            >
              H-Forum
            </Link>
            
            {/* Desktop Search */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search for Topics"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 md:w-80 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="absolute right-3 top-2.5 h-4 w-4 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/ask-question"
                  className="bg-purple-600 text-white px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <span className="hidden sm:inline">+ Start a New Topic</span>
                  <span className="sm:hidden">+ New</span>
                </Link>
                {/* User Profile Dropdown */}
                <div className="relative profile-dropdown">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium hover:bg-purple-700 transition-colors cursor-pointer"
                    title={user?.username || 'User Profile'}
                  >
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        View Profile
                      </Link>
                      <Link
                        to="/edit-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        Edit Profile
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          logout();
                          navigate('/login');
                          setShowProfileDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link 
                to="/login" 
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="sm:hidden px-4 py-3 bg-white border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for Topics"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="absolute right-3 top-2.5 h-4 w-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <nav>
                <ul className="space-y-2">
                  {sidebarItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                          location.pathname === item.path
                            ? 'bg-purple-100 text-purple-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* Mobile Top Users */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Users</h3>
                {topUsers.length > 0 ? (
                  <ul className="space-y-3">
                    {topUsers.slice(0, 5).map((topUser, index) => (
                      <li key={topUser._id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {topUser.username}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm text-center">Loading users...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-6">
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-purple-100 text-purple-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>

        {/* Desktop Right Sidebar - Top Users */}
        <aside className="hidden xl:block w-64 bg-white border-l border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Users</h3>
          {topUsers.length > 0 ? (
            <ul className="space-y-3">
              {topUsers.map((topUser, index) => (
                <li key={topUser._id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900 truncate">
                      {topUser.username}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm text-center">Loading users...</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Layout;