// Activity Controller - Logging and history
const ActivityLog = require('../models/ActivityLog');
const ChildProfile = require('../models/ChildProfile');

const extractDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
};

// POST /api/activity/log - Called by extension to log page visits
const logActivity = async (req, res) => {
  const { url, type, status, blockReason, pageTitle, timeSpent } = req.body;
  const child = req.child;

  if (!url || !type || !status) {
    return res.status(400).json({ error: 'url, type, and status are required.' });
  }

  try {
    await ActivityLog.create({
      childId: child._id,
      url: url.slice(0, 2048),
      domain: extractDomain(url),
      type,
      status,
      blockReason,
      pageTitle,
      timeSpent
    });
    res.json({ message: 'Activity logged.' });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
};

// GET /api/activity/history?childId=&page=&limit=&status=&from=&to=
const getHistory = async (req, res) => {
  const { childId, page = 1, limit = 50, status, from, to } = req.query;

  try {
    // Verify parent owns this child
    const child = await ChildProfile.findOne({ _id: childId, parentId: req.user._id });
    if (!child) return res.status(403).json({ error: 'Unauthorized.' });

    const query = { childId };
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity history.' });
  }
};

// GET /api/activity/stats?childId= - Weekly analytics
const getStats = async (req, res) => {
  const { childId } = req.query;

  try {
    const child = await ChildProfile.findOne({ _id: childId, parentId: req.user._id });
    if (!child) return res.status(403).json({ error: 'Unauthorized.' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [dailyStats, topDomains, blockReasons] = await Promise.all([
      // Daily blocked vs allowed counts for last 7 days
      ActivityLog.aggregate([
        { $match: { childId: child._id, createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      // Top visited domains
      ActivityLog.aggregate([
        { $match: { childId: child._id, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // Block reason breakdown
      ActivityLog.aggregate([
        { $match: { childId: child._id, status: 'blocked', createdAt: { $gte: sevenDaysAgo } } },
        { $unwind: '$blockReason.categories' },
        { $group: { _id: '$blockReason.categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({ dailyStats, topDomains, blockReasons });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

module.exports = { logActivity, getHistory, getStats };
