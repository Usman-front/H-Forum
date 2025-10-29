import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Answer content is required'],
    trim: true,
    minlength: [10, 'Answer must be at least 10 characters long']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votes: {
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  isAccepted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Question description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters long']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  answers: [answerSchema],
  votes: {
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isResolved: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
questionSchema.index({ title: 'text', description: 'text', tags: 'text' });
questionSchema.index({ author: 1, createdAt: -1 });
questionSchema.index({ topics: 1, createdAt: -1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ lastActivity: -1 });

// Virtual for vote score
questionSchema.virtual('voteScore').get(function() {
  return this.votes.upvotes.length - this.votes.downvotes.length;
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function() {
  return this.answers.length;
});

// Method to increment views
questionSchema.methods.incrementViews = function(userId) {
  // Only increment if user hasn't viewed recently (within 24 hours)
  const recentView = this.viewedBy.find(view => 
    view.user.toString() === userId.toString() && 
    (Date.now() - view.viewedAt) < 24 * 60 * 60 * 1000
  );
  
  if (!recentView) {
    this.views += 1;
    this.viewedBy.push({ user: userId });
    // Keep only last 100 views to prevent unlimited growth
    if (this.viewedBy.length > 100) {
      this.viewedBy = this.viewedBy.slice(-100);
    }
  }
  
  return this.save();
};

// Method to add answer
questionSchema.methods.addAnswer = function(answerData) {
  this.answers.push(answerData);
  this.lastActivity = new Date();
  return this.save();
};

// Method to vote on question
questionSchema.methods.vote = function(userId, voteType) {
  const userIdStr = userId.toString();
  
  // Remove existing votes by this user
  this.votes.upvotes = this.votes.upvotes.filter(id => id.toString() !== userIdStr);
  this.votes.downvotes = this.votes.downvotes.filter(id => id.toString() !== userIdStr);
  
  // Add new vote
  if (voteType === 'upvote') {
    this.votes.upvotes.push(userId);
  } else if (voteType === 'downvote') {
    this.votes.downvotes.push(userId);
  }
  
  return this.save();
};

// Update lastActivity before saving
questionSchema.pre('save', function(next) {
  if (this.isModified('answers')) {
    this.lastActivity = new Date();
  }
  next();
});

export default mongoose.model('Question', questionSchema);