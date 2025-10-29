import express from 'express';
import Topic from '../models/Topic.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/topics
// @desc    Get all topics with optional filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'popular',
      featured
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'popular':
        sort = { questionCount: -1, followerCount: -1 };
        break;
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'active':
        sort = { lastActivity: -1 };
        break;
      case 'alphabetical':
        sort = { name: 1 };
        break;
      default:
        sort = { questionCount: -1 };
    }

    // Execute query
    const topics = await Topic.find(query)
      .populate('createdBy', 'username avatar')
      .populate('moderators', 'username avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Topic.countDocuments(query);

    // Add user following status if authenticated
    let topicsWithFollowStatus = topics;
    if (req.user) {
      topicsWithFollowStatus = topics.map(topic => ({
        ...topic,
        isFollowing: topic.followers && topic.followers.includes(req.user._id)
      }));
    }

    res.json({
      success: true,
      topics: topicsWithFollowStatus,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching topics'
    });
  }
});

// @route   GET /api/topics/popular
// @desc    Get popular topics
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const topics = await Topic.getPopularTopics(parseInt(limit));
    
    res.json({
      success: true,
      topics
    });

  } catch (error) {
    console.error('Get popular topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching popular topics'
    });
  }
});

// @route   GET /api/topics/:slug
// @desc    Get single topic by slug
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug, isActive: true })
      .populate('creator', 'username avatar reputation createdAt')
      .populate('moderators', 'username avatar reputation');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Add user following status if authenticated
    const topicWithFollowStatus = {
      ...topic.toObject(),
      isFollowing: req.user && topic.followers ? topic.followers.includes(req.user._id) : false
    };

    res.json({
      success: true,
      topic: topicWithFollowStatus
    });

  } catch (error) {
    console.error('Get topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching topic'
    });
  }
});

// @route   POST /api/topics
// @desc    Create a new topic
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    // Check if topic already exists
    const existingTopic = await Topic.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingTopic) {
      return res.status(400).json({
        success: false,
        message: 'Topic with this name already exists'
      });
    }

    // Create topic
    const topic = new Topic({
      name,
      description,
      color: color || '#8B5CF6',
      icon: icon || '💬',
      creator: req.user._id
    });

    await topic.save();

    const populatedTopic = await Topic.findById(topic._id)
      .populate('creator', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      topic: populatedTopic
    });

  } catch (error) {
    console.error('Create topic error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating topic'
    });
  }
});

// @route   PUT /api/topics/:slug
// @desc    Update a topic
// @access  Private (Admin or Moderator)
router.put('/:slug', authenticateToken, async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug, isActive: true });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isModerator = topic.moderators.includes(req.user._id);
    const isCreator = topic.creator.toString() === req.user._id.toString();

    if (!isAdmin && !isModerator && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this topic'
      });
    }

    const { name, description, color, icon, isFeatured } = req.body;

    // Update fields
    if (name) topic.name = name;
    if (description) topic.description = description;
    if (color) topic.color = color;
    if (icon) topic.icon = icon;
    if (typeof isFeatured === 'boolean' && isAdmin) {
      topic.isFeatured = isFeatured;
    }

    await topic.save();

    const updatedTopic = await Topic.findById(topic._id)
      .populate('creator', 'username avatar')
      .populate('moderators', 'username avatar');

    res.json({
      success: true,
      message: 'Topic updated successfully',
      topic: updatedTopic
    });

  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating topic'
    });
  }
});

// @route   DELETE /api/topics/:slug
// @desc    Delete a topic (soft delete)
// @access  Private (Admin only)
router.delete('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Check if topic has questions
    const questionCount = await Question.countDocuments({ 
      topics: topic._id, 
      isActive: true 
    });

    if (questionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete topic with ${questionCount} active questions`
      });
    }

    // Soft delete
    topic.isActive = false;
    await topic.save();

    res.json({
      success: true,
      message: 'Topic deleted successfully'
    });

  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting topic'
    });
  }
});

// @route   POST /api/topics/:slug/follow
// @desc    Follow/unfollow a topic
// @access  Private
router.post('/:slug/follow', authenticateToken, async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug, isActive: true });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    const userId = req.user._id;
    const isFollowing = topic.followers && topic.followers.includes(userId);

    if (isFollowing) {
      // Unfollow
      topic.followers = topic.followers.filter(id => id.toString() !== userId.toString());
      await topic.decrementFollowerCount();
    } else {
      // Follow
      if (!topic.followers) topic.followers = [];
      topic.followers.push(userId);
      await topic.incrementFollowerCount();
    }

    await topic.save();

    res.json({
      success: true,
      message: isFollowing ? 'Topic unfollowed successfully' : 'Topic followed successfully',
      isFollowing: !isFollowing,
      followerCount: topic.followerCount
    });

  } catch (error) {
    console.error('Follow topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following topic'
    });
  }
});

// @route   POST /api/topics/:slug/moderators
// @desc    Add moderator to topic
// @access  Private (Admin only)
router.post('/:slug/moderators', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const topic = await Topic.findOne({ slug: req.params.slug, isActive: true });
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (topic.moderators.includes(user._id)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a moderator'
      });
    }

    topic.moderators.push(user._id);
    await topic.save();

    const updatedTopic = await Topic.findById(topic._id)
      .populate('moderators', 'username avatar');

    res.json({
      success: true,
      message: 'Moderator added successfully',
      moderators: updatedTopic.moderators
    });

  } catch (error) {
    console.error('Add moderator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding moderator'
    });
  }
});

// @route   DELETE /api/topics/:slug/moderators/:userId
// @desc    Remove moderator from topic
// @access  Private (Admin only)
router.delete('/:slug/moderators/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug, isActive: true });
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    topic.moderators = topic.moderators.filter(
      id => id.toString() !== req.params.userId
    );
    await topic.save();

    const updatedTopic = await Topic.findById(topic._id)
      .populate('moderators', 'username avatar');

    res.json({
      success: true,
      message: 'Moderator removed successfully',
      moderators: updatedTopic.moderators
    });

  } catch (error) {
    console.error('Remove moderator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing moderator'
    });
  }
});

export default router;