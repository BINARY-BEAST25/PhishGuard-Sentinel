const ActivityLog = require('../models/ActivityLog');
const ChildProfile = require('../models/ChildProfile');

// POST /api/activity/log
exports.logActivity = async (req, res) => {
  try {
    const { deviceId, url, type, status, blockReason, title } = req.body;
    const child = await ChildProfile.findOne({ deviceId, isActive: true });
    if (!child) return res.status(404).json({ error: 'Device not found' });

    let domain;
    try { domain = new URL(url).hostname; } catch { domain = url; }

    const log = await ActivityLog.create({
      childId: child._id,
      parentId: child.parentId,
      url, domain, title, type, status, blockReason,
    });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/activity/history
exports.getHistory = async (req, res) => {
  try {
    const { childId, page = 1, limit = 50, status } = req.query;
    const query = { parentId: req.user._id };
    if (childId) query.childId = childId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      ActivityLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)).populate('childId', 'name'),
      ActivityLog.countDocuments(query),
    ]);

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/activity/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { childId, days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const query = { parentId: req.user._id, timestamp: { $gte: since } };
    if (childId) query.childId = childId;

    const [total, blocked, byDay, topDomains] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.countDocuments({ ...query, status: 'blocked' }),
      ActivityLog.aggregate([
        { $match: query },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      ActivityLog.aggregate([
        { $match: { ...query, status: 'blocked' } },
        { $group: { _id: '$domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ total, blocked, allowed: total - blocked, byDay, topDomains });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
