import express from 'express';
import User from '../models/User.js';
import Question from '../models/Question.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with pagination and filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'reputation',
      role
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { isActive: true };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      query.role = role;
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'reputation':
        sort = { reputation: -1, createdAt: -1 };
        break;
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'active':
        sort = { lastActive: -1 };
        break;
      case 'questions':
        sort = { questionsAsked: -1 };
        break;
      case 'alphabetical':
        sort = { username: 1 };
        break;
      default:
        sort = { reputation: -1 };
    }

    // Execute query
    const users = await User.find(query)
      .select('-password -email') // Exclude sensitive fields
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   GET /api/users/top
// @desc    Get top users by reputation
// @access  Public
router.get('/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const users = await User.find({ isActive: true })
      .select('username avatar reputation questionsAsked answersGiven createdAt')
      .sort({ reputation: -1, questionsAsked: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top users'
    });
  }
});

// @route   GET /api/users/:username
// @desc    Get user profile by username
// @access  Public
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's questions count
    const questionCount = await Question.countDocuments({
      author: user._id,
      isActive: true
    });

    // Get user's recent questions
    const recentQuestions = await Question.find({
      author: user._id,
      isActive: true
    })
    .populate('topics', 'name slug color')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title slug createdAt views topics')
    .lean();

    // Prepare user profile (hide email from others)
    const userProfile = user.toObject();
    if (!req.user || req.user._id.toString() !== user._id.toString()) {
      delete userProfile.email;
    }

    res.json({
      success: true,
      user: {
        ...userProfile,
        questionCount,
        recentQuestions
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile'
    });
  }
});

// @route   GET /api/users/:username/questions
// @desc    Get user's questions
// @access  Public
router.get('/:username/questions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'recent'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find user
    const user = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'recent':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { views: -1, createdAt: -1 };
        break;
      case 'answered':
        sort = { 'answers.0': -1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Get user's questions
    const questions = await Question.find({
      author: user._id,
      isActive: true
    })
    .populate('topics', 'name slug color')
    .populate('answers.author', 'username avatar')
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

    // Get total count
    const total = await Question.countDocuments({
      author: user._id,
      isActive: true
    });

    // Add computed fields
    const questionsWithStats = questions.map(question => ({
      ...question,
      voteScore: question.votes.upvotes.length - question.votes.downvotes.length,
      answerCount: question.answers.length,
      hasAcceptedAnswer: question.answers.some(answer => answer.isAccepted)
    }));

    res.json({
      success: true,
      questions: questionsWithStats,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get user questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user questions'
    });
  }
});

// @route   PUT /api/users/:username
// @desc    Update user profile
// @access  Private (Own profile or Admin)
router.put('/:username', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    const isOwnProfile = user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const { bio, avatar, location, website, socialLinks } = req.body;

    // Update allowed fields
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (socialLinks !== undefined) user.socialLinks = socialLinks;

    // Admin-only fields
    if (isAdmin) {
      const { role, reputation, isActive } = req.body;
      if (role !== undefined) user.role = role;
      if (reputation !== undefined) user.reputation = reputation;
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();

    // Return updated user (excluding password)
    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   DELETE /api/users/:username
// @desc    Delete user account (soft delete)
// @access  Private (Own account or Admin)
router.delete('/:username', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    const isOwnAccount = user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this account'
      });
    }

    // Prevent admin from deleting themselves
    if (isOwnAccount && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot delete their own account'
      });
    }

    // Soft delete
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`; // Prevent email conflicts
    await user.save();

    // Also soft delete user's questions
    await Question.updateMany(
      { author: user._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting account'
    });
  }
});

// @route   POST /api/users/:username/follow
// @desc    Follow/unfollow a user
// @access  Private
router.post('/:username/follow', authenticateToken, async (req, res) => {
  try {
    const userToFollow = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    });

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Can't follow yourself
    if (userToFollow._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following && currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== currentUser._id.toString()
      );
    } else {
      // Follow
      if (!currentUser.following) currentUser.following = [];
      if (!userToFollow.followers) userToFollow.followers = [];
      
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      success: true,
      message: isFollowing ? 'User unfollowed successfully' : 'User followed successfully',
      isFollowing: !isFollowing,
      followerCount: userToFollow.followers.length
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following user'
    });
  }
});

// @route   GET /api/users/:username/followers
// @desc    Get user's followers
// @access  Public
router.get('/:username/followers', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const followers = await User.find({
      _id: { $in: user.followers || [] },
      isActive: true
    })
    .select('username avatar reputation createdAt')
    .sort({ reputation: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    const total = user.followers ? user.followers.length : 0;

    res.json({
      success: true,
      followers,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching followers'
    });
  }
});

// @route   GET /api/users/:username/following
// @desc    Get users that this user is following
// @access  Public
router.get('/:username/following', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const user = await User.findOne({ 
      username: req.params.username, 
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const following = await User.find({
      _id: { $in: user.following || [] },
      isActive: true
    })
    .select('username avatar reputation createdAt')
    .sort({ reputation: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    const total = user.following ? user.following.length : 0;

    res.json({
      success: true,
      following,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching following'
    });
  }
});

export default router;