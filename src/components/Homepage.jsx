import { Link } from 'react-router-dom';

const Homepage = () => {
  const topics = [
    { name: 'Technology', color: 'bg-red-500', icon: '🔴' },
    { name: 'Climate', color: 'bg-green-500', icon: '🟢' },
    { name: 'Space exploration', color: 'bg-purple-500', icon: '🟣' },
    { name: 'AI and ethics', color: 'bg-pink-500', icon: '🔴' },
    { name: 'Social media', color: 'bg-teal-500', icon: '🟢' },
    { name: 'Mental health', color: 'bg-blue-500', icon: '🔵' },
    { name: 'Education', color: 'bg-purple-500', icon: '🟣' },
    { name: 'Health', color: 'bg-pink-500', icon: '🔴' },
    { name: 'Culture', color: 'bg-yellow-500', icon: '🟡' },
    { name: 'Politics', color: 'bg-orange-500', icon: '🟠' },
    { name: 'Sports', color: 'bg-purple-500', icon: '🟣' },
    { name: 'Public opinion', color: 'bg-green-500', icon: '🟢' },
    { name: 'History', color: 'bg-green-500', icon: '🟢' },
    { name: 'Economy', color: 'bg-blue-500', icon: '🔵' },
    { name: 'Business', color: 'bg-red-500', icon: '🔴' },
    { name: 'Science', color: 'bg-purple-500', icon: '🟣' },
    { name: 'Philosophy', color: 'bg-green-500', icon: '🟢' },
    { name: 'Art', color: 'bg-blue-500', icon: '🔵' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Explore Topics</h1>
        <p className="text-gray-600">Select a topic to discover related discussions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mb-8 auto-rows-fr">
        {topics.map((topic) => (
          <Link
            key={topic.name}
            to={`/topics/${topic.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer w-full h-full min-h-[80px]"
          >
            <div className={`w-3 h-3 rounded-full ${topic.color} flex-shrink-0 mt-1`}></div>
            <span className="text-sm font-medium text-gray-700 flex-1 text-left leading-tight break-words">{topic.name}</span>
          </Link>
        ))}
      </div>


    </div>
  );
};

export default Homepage;