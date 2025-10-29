import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Topic name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Topic name must be at least 2 characters long'],
    maxlength: [50, 'Topic name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#8B5CF6', // Default purple color
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  icon: {
    type: String,
    default: '🟣'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  questionCount: {
    type: Number,
    default: 0
  },
  followerCount: {
    type: Number,
    default: 0
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create slug from name before saving
topicSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens
  }
  next();
});

// Index for better search performance
topicSchema.index({ name: 'text', description: 'text' });
topicSchema.index({ slug: 1 });
topicSchema.index({ questionCount: -1 });
topicSchema.index({ followerCount: -1 });

// Method to increment question count
topicSchema.methods.incrementQuestionCount = function() {
  this.questionCount += 1;
  this.lastActivity = new Date();
  return this.save();
};

// Method to decrement question count
topicSchema.methods.decrementQuestionCount = function() {
  this.questionCount = Math.max(0, this.questionCount - 1);
  return this.save();
};

// Method to add follower
topicSchema.methods.addFollower = function() {
  this.followerCount += 1;
  return this.save();
};

// Method to remove follower
topicSchema.methods.removeFollower = function() {
  this.followerCount = Math.max(0, this.followerCount - 1);
  return this.save();
};

// Static method to get popular topics
topicSchema.statics.getPopularTopics = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ questionCount: -1, followerCount: -1 })
    .limit(limit)
    .select('name slug description color icon questionCount followerCount');
};

// Static method to search topics
topicSchema.statics.searchTopics = function(query, limit = 20) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  })
  .limit(limit)
  .select('name slug description color icon questionCount followerCount');
};

export default mongoose.model('Topic', topicSchema);