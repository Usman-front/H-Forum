import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsAPI, topicsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AskQuestion = () => {
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [relatedTags, setRelatedTags] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Fetch topics for dropdown
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // Debug the API response
        console.log('Fetching topics...');
        const response = await topicsAPI.getTopics();
        console.log('Topics API response:', response);
        
        if (response && response.topics && response.topics.length > 0) {
          setTopics(response.topics);
          console.log('Topics set successfully:', response.topics);
        } else {
          console.error('No topics found in response:', response);
          // Fallback to popular topics if main endpoint returns empty
          const popularResponse = await topicsAPI.getPopularTopics(20);
          console.log('Popular topics response:', popularResponse);
          
          if (popularResponse && popularResponse.topics && popularResponse.topics.length > 0) {
            setTopics(popularResponse.topics);
            console.log('Popular topics set successfully:', popularResponse.topics);
          } else {
            // Hardcoded fallback topics based on user requirements
            const fallbackTopics = [
              { _id: 'technology', name: 'Technology', slug: 'technology' },
              { _id: 'climate', name: 'Climate', slug: 'climate' },
              { _id: 'space-exploration', name: 'Space exploration', slug: 'space-exploration' },
              { _id: 'ai-and-ethics', name: 'AI and ethics', slug: 'ai-and-ethics' },
              { _id: 'social-media', name: 'Social media', slug: 'social-media' },
              { _id: 'mental-health', name: 'Mental health', slug: 'mental-health' },
              { _id: 'education', name: 'Education', slug: 'education' },
              { _id: 'health', name: 'Health', slug: 'health' },
              { _id: 'culture', name: 'Culture', slug: 'culture' },
              { _id: 'politics', name: 'Politics', slug: 'politics' },
              { _id: 'sports', name: 'Sports', slug: 'sports' },
              { _id: 'public-opinion', name: 'Public opinion', slug: 'public-opinion' },
              { _id: 'history', name: 'History', slug: 'history' },
              { _id: 'economy', name: 'Economy', slug: 'economy' },
              { _id: 'business', name: 'Business', slug: 'business' },
              { _id: 'science', name: 'Science', slug: 'science' },
              { _id: 'philosophy', name: 'Philosophy', slug: 'philosophy' },
              { _id: 'art', name: 'Art', slug: 'art' }
            ];
            setTopics(fallbackTopics);
            console.log('Using fallback topics:', fallbackTopics);
          }
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
        // Hardcoded fallback topics based on user requirements
        const fallbackTopics = [
          { _id: 'technology', name: 'Technology', slug: 'technology' },
          { _id: 'climate', name: 'Climate', slug: 'climate' },
          { _id: 'space-exploration', name: 'Space exploration', slug: 'space-exploration' },
          { _id: 'ai-and-ethics', name: 'AI and ethics', slug: 'ai-and-ethics' },
          { _id: 'social-media', name: 'Social media', slug: 'social-media' },
          { _id: 'mental-health', name: 'Mental health', slug: 'mental-health' },
          { _id: 'education', name: 'Education', slug: 'education' },
          { _id: 'health', name: 'Health', slug: 'health' },
          { _id: 'culture', name: 'Culture', slug: 'culture' },
          { _id: 'politics', name: 'Politics', slug: 'politics' },
          { _id: 'sports', name: 'Sports', slug: 'sports' },
          { _id: 'public-opinion', name: 'Public opinion', slug: 'public-opinion' },
          { _id: 'history', name: 'History', slug: 'history' },
          { _id: 'economy', name: 'Economy', slug: 'economy' },
          { _id: 'business', name: 'Business', slug: 'business' },
          { _id: 'science', name: 'Science', slug: 'science' },
          { _id: 'philosophy', name: 'Philosophy', slug: 'philosophy' },
          { _id: 'art', name: 'Art', slug: 'art' }
        ];
        setTopics(fallbackTopics);
        console.log('Using fallback topics due to error:', fallbackTopics);
      }
    };
    
    fetchTopics();
  }, []);

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv'];
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (!validTypes.includes(file.type)) {
        setError(`${file.name} is not a supported file type. Please use images (JPEG, PNG, GIF) or videos (MP4, MOV, AVI, WEBM, MKV).`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }
      
      return true;
    });
    
    if (attachments.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed per question.');
      return;
    }
    
    const newAttachments = validFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setError(null);
  };
  
  const removeAttachment = (id) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== id);
      // Clean up preview URLs
      const removed = prev.find(att => att.id === id);
      if (removed && removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('title', questionTitle.trim());
      formData.append('description', questionDescription.trim());
      formData.append('tags', relatedTags);
      if (selectedTopic) {
        formData.append('topics', JSON.stringify([selectedTopic]));
      }
      
      // Add file attachments
      attachments.forEach(attachment => {
        formData.append('attachments', attachment.file);
      });
      
      console.log('Submitting question with attachments:', attachments.length);
      
      const response = await questionsAPI.createQuestion(formData);
      
      // Clean up preview URLs
      attachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
      
      // Navigate to the question or back to home
      navigate('/');
    } catch (err) {
      console.error('Full error object:', err);
      setError(err.message || 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-8 text-white">
        <h1 className="text-2xl font-bold mb-6 text-center">Ask a Question</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="questionTitle" className="block text-sm font-medium mb-2">
              Question Title *
            </label>
            <input
              type="text"
              id="questionTitle"
              value={questionTitle}
              onChange={(e) => setQuestionTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 text-white-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder="Enter your question title"
              required
              minLength={10}
              maxLength={200}
            />
            <p className="text-xs text-purple-200 mt-1">
              {questionTitle.length}/200 characters (minimum 10)
            </p>
          </div>
          
          <div>
            <label htmlFor="selectedTopic" className="block text-sm font-medium mb-2">
              Topic *
            </label>
            <select
              id="selectedTopic"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-purple-200 cursor-pointer"
              required
            >
              <option value="">Select a topic</option>
              {topics && topics.length > 0 ? (
                topics.map((topic) => (
                  <option key={topic._id || topic.slug} value={topic.slug}>
                    {topic.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading topics...</option>
              )}
            </select>
            {topics && topics.length === 0 && (
              <p className="text-xs text-purple-200 mt-1">
                No topics available. Please try refreshing the page.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="questionDescription" className="block text-sm font-medium mb-2">
              Question Description *
            </label>
            <textarea
              id="questionDescription"
              value={questionDescription}
              onChange={(e) => setQuestionDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 text-white-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
              placeholder="Provide a detailed description of your question. Include what you've tried and what specific help you need."
              required
              minLength={20}
              maxLength={5000}
            />
            <p className="text-xs text-purple-200 mt-1">
              {questionDescription.length}/5000 characters (minimum 20)
            </p>
          </div>

          <div>
            <label htmlFor="relatedTags" className="block text-sm font-medium mb-2">
              Related Tags
            </label>
            <input
              type="text"
              id="relatedTags"
              value={relatedTags}
              onChange={(e) => setRelatedTags(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 text-white-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              placeholder="Enter tags separated by commas (e.g., javascript, react, api)"
              maxLength={200}
            />
            <p className="text-xs text-purple-200 mt-1">
              Separate tags with commas. Maximum 5 tags.
            </p>
          </div>
          
          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Attachments (Optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-purple-400 bg-purple-50/10' 
                  : 'border-purple-300 hover:border-purple-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-2">
                <div className="text-4xl">📎</div>
                <div className="text-purple-200">
                  <p>Drag and drop files here, or</p>
                  <label className="cursor-pointer text-purple-300 hover:text-white underline">
                    browse files
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-purple-300">
                  Images (JPEG, PNG, GIF) and Videos (MP4, MOV, AVI, WEBM, MKV)
                  <br />Maximum 5 files, 50MB each
                </p>
              </div>
            </div>
            
            {/* File Previews */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-purple-200">Attached Files:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
                      {attachment.preview ? (
                        <img 
                          src={attachment.preview} 
                          alt="Preview" 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-purple-600 rounded flex items-center justify-center text-white text-xs">
                          {attachment.file.type.startsWith('video/') ? '🎥' : '📄'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{attachment.file.name}</p>
                        <p className="text-xs text-purple-300">
                          {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-800 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-900 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={isSubmitting || questionTitle.length < 10 || questionDescription.length < 20 || !selectedTopic}
            >
              <span>📝</span>
              <span>{isSubmitting ? 'Posting...' : 'Ask on Community'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AskQuestion;