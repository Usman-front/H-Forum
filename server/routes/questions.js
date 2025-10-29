import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Question from '../models/Question.js';
import Topic from '../models/Topic.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG, GIF) and videos (MP4, MOV, AVI, WEBM, MKV) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// @route   GET /api/questions
// @desc    Get all questions with pagination and filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      topic,
      author,
      search,
      sortBy = 'recent',
      tags
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { isActive: true };

    if (topic) {
      const topicDoc = await Topic.findOne({ slug: topic });
      if (topicDoc) {
        query.topics = topicDoc._id;
      }
    }

    if (author) {
      const authorDoc = await User.findOne({ username: author });
      if (authorDoc) {
        query.author = authorDoc._id;
      }
    }

    if (search) {
      // Use regex for partial matching instead of text search
      const searchRegex = new RegExp(search, 'i'); // case-insensitive
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
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
      case 'unanswered':
        query['answers.0'] = { $exists: false };
        sort = { createdAt: -1 };
        break;
      default:
        sort = { lastActivity: -1 };
    }

    // Execute query
    const questions = await Question.find(query)
      .populate('author', 'username avatar reputation')
      .populate('topics', 'name slug color')
      .populate('answers.author', 'username avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Question.countDocuments(query);

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
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching questions'
    });
  }
});

// @route   GET /api/questions/:id
// @desc    Get single question by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar reputation createdAt')
      .populate('topics', 'name slug color')
      .populate('answers.author', 'username avatar reputation')
      .populate('votes.upvotes', 'username')
      .populate('votes.downvotes', 'username');

    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Increment views if user is authenticated
    if (req.user) {
      await question.incrementViews(req.user._id);
    }

    // Add computed fields
    const questionWithStats = {
      ...question.toObject(),
      voteScore: question.votes.upvotes.length - question.votes.downvotes.length,
      answerCount: question.answers.length,
      hasAcceptedAnswer: question.answers.some(answer => answer.isAccepted),
      userVote: req.user ? (
        question.votes.upvotes.some(vote => vote._id.toString() === req.user._id.toString()) ? 'upvote' :
        question.votes.downvotes.some(vote => vote._id.toString() === req.user._id.toString()) ? 'downvote' :
        null
      ) : null
    };

    res.json({
      success: true,
      question: questionWithStats
    });

  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching question'
    });
  }
});

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post('/', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, topics, tags } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Process topics
    let topicIds = [];
    if (topics) {
      let topicsArray = [];
      try {
        // If topics is a JSON string, parse it
        topicsArray = typeof topics === 'string' ? JSON.parse(topics) : topics;
      } catch (e) {
        // If parsing fails, treat as single topic
        topicsArray = [topics];
      }
      
      if (Array.isArray(topicsArray) && topicsArray.length > 0) {
        const topicDocs = await Topic.find({ 
          slug: { $in: topicsArray.map(t => t.toLowerCase().replace(/\s+/g, '-')) }
        });
        topicIds = topicDocs.map(topic => topic._id);
      }
    }

    // Process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        // If tags is already an array
        processedTags = tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0)
          .slice(0, 10); // Limit to 10 tags
      } else {
        // If tags is a string
        processedTags = tags
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0)
          .slice(0, 10); // Limit to 10 tags
      }
    }

    // Process file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }));
    }

    // Create question
    const question = new Question({
      title,
      description,
      author: req.user._id,
      topics: topicIds,
      tags: processedTags,
      attachments: attachments
    });

    await question.save();

    // Update user's question count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { questionsAsked: 1 }
    });

    // Update topic question counts
    if (topicIds.length > 0) {
      await Topic.updateMany(
        { _id: { $in: topicIds } },
        { $inc: { questionCount: 1 }, lastActivity: new Date() }
      );
    }

    // Populate and return the created question
    const populatedQuestion = await Question.findById(question._id)
      .populate('author', 'username avatar reputation')
      .populate('topics', 'name slug color');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: populatedQuestion
    });

  } catch (error) {
    console.error('Create question error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating question'
    });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private (Author only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership
    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this question'
      });
    }

    const { title, description, topics, tags } = req.body;

    // Update fields
    if (title) question.title = title;
    if (description) question.description = description;

    // Process topics
    if (topics) {
      const topicDocs = await Topic.find({ 
        slug: { $in: topics.map(t => t.toLowerCase().replace(/\s+/g, '-')) }
      });
      question.topics = topicDocs.map(topic => topic._id);
    }

    // Process tags
    if (tags !== undefined) {
      question.tags = tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 10);
    }

    await question.save();

    const updatedQuestion = await Question.findById(question._id)
      .populate('author', 'username avatar reputation')
      .populate('topics', 'name slug color');

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion
    });

  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating question'
    });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question (soft delete)
// @access  Private (Author or Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership
    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question'
      });
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    // Update user's question count
    await User.findByIdAndUpdate(question.author, {
      $inc: { questionsAsked: -1 }
    });

    // Update topic question counts
    if (question.topics.length > 0) {
      await Topic.updateMany(
        { _id: { $in: question.topics } },
        { $inc: { questionCount: -1 } }
      );
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting question'
    });
  }
});

// @route   POST /api/questions/:id/vote
// @desc    Vote on a question
// @access  Private
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote', 'downvote', or 'remove'

    if (!['upvote', 'downvote', 'remove'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const question = await Question.findById(req.params.id);

    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Can't vote on own question
    if (question.author.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote on your own question'
      });
    }

    await question.vote(req.user._id, voteType);

    const voteScore = question.votes.upvotes.length - question.votes.downvotes.length;

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      voteScore,
      userVote: voteType === 'remove' ? null : voteType
    });

  } catch (error) {
    console.error('Vote question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording vote'
    });
  }
});

// @route   POST /api/questions/:id/answers
// @desc    Add an answer to a question
// @access  Private
router.post('/:id/answers', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const questionId = req.params.id;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Answer content is required' });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const newAnswer = {
      content: content.trim(),
      author: userId,
      createdAt: new Date(),
      votes: 0,
      isAccepted: false
    };

    question.answers.push(newAnswer);
    await question.save();

    // Populate the new answer with author details
    await question.populate('answers.author', 'username avatar');
    const addedAnswer = question.answers[question.answers.length - 1];

    res.status(201).json({
      message: 'Answer added successfully',
      answer: addedAnswer
    });
  } catch (error) {
    console.error('Error adding answer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions/:id/answers/:answerId/vote
// @desc    Vote on an answer
// @access  Private
router.post('/:id/answers/:answerId/vote', authenticateToken, async (req, res) => {
  try {
    const { voteType } = req.body;
    const questionId = req.params.id;
    const answerId = req.params.answerId;
    const userId = req.user._id;

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid vote type' });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const answer = question.answers.id(answerId);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    // Can't vote on own answer
    if (answer.author.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote on your own answer'
      });
    }

    // Remove user from both vote arrays first
    answer.votes.upvotes = answer.votes.upvotes.filter(id => !id.equals(userId));
    answer.votes.downvotes = answer.votes.downvotes.filter(id => !id.equals(userId));

    // Add vote based on type
    if (voteType === 'upvote') {
      answer.votes.upvotes.push(userId);
    } else {
      answer.votes.downvotes.push(userId);
    }

    await question.save();

    const voteScore = answer.votes.upvotes.length - answer.votes.downvotes.length;
    
    res.json({
      message: 'Vote recorded successfully',
      voteScore,
      userVote: voteType
    });
  } catch (error) {
    console.error('Error voting on answer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;