const { getDb } = require('../config/firebase');

const CHILD_COLLECTION = 'childProfiles';
const ACTIVITY_COLLECTION = 'activityLogs';

const withId = (doc) => ({
  _id: doc.id,
  id: doc.id,
  ...doc.data(),
});

const resolveDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(url || '');
  }
};

const getChildNameMap = async (parentId) => {
  const snapshot = await getDb().collection(CHILD_COLLECTION).where('parentId', '==', parentId).get();
  const map = new Map();
  snapshot.docs.forEach((doc) => {
    const child = withId(doc);
    map.set(child._id, child.name || 'Unknown');
  });
  return map;
};

exports.logActivity = async (req, res) => {
  try {
    const { deviceId, url, type, status, blockReason, title } = req.body;
    const childSnapshot = await getDb()
      .collection(CHILD_COLLECTION)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();

    if (childSnapshot.empty) return res.status(404).json({ error: 'Device not found' });

    const child = withId(childSnapshot.docs[0]);
    if (child.isActive === false) return res.status(404).json({ error: 'Device not found' });

    const log = {
      childId: child._id,
      parentId: child.parentId,
      url,
      domain: resolveDomain(url),
      title: title || null,
      type: type || 'page',
      status: status || 'allowed',
      blockReason: blockReason || null,
      timestamp: Date.now(),
    };

    const ref = await getDb().collection(ACTIVITY_COLLECTION).add(log);
    return res.status(201).json({ log: { _id: ref.id, id: ref.id, ...log } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const { childId, status } = req.query;

    const snapshot = await getDb()
      .collection(ACTIVITY_COLLECTION)
      .where('parentId', '==', req.user.uid)
      .get();

    let logs = snapshot.docs.map(withId);
    if (childId) logs = logs.filter((log) => log.childId === childId);
    if (status) logs = logs.filter((log) => log.status === status);
    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const total = logs.length;
    const start = (page - 1) * limit;
    const paged = logs.slice(start, start + limit);

    const childMap = await getChildNameMap(req.user.uid);
    const formatted = paged.map((log) => ({
      ...log,
      childId: {
        _id: log.childId,
        name: childMap.get(log.childId) || 'Unknown',
      },
    }));

    return res.json({
      logs: formatted,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const days = Math.max(1, Number(req.query.days || 7));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const { childId } = req.query;

    const snapshot = await getDb()
      .collection(ACTIVITY_COLLECTION)
      .where('parentId', '==', req.user.uid)
      .get();

    let logs = snapshot.docs.map(withId).filter((log) => (log.timestamp || 0) >= since);
    if (childId) logs = logs.filter((log) => log.childId === childId);

    const total = logs.length;
    const blocked = logs.filter((log) => log.status === 'blocked').length;

    const byDayMap = new Map();
    const topDomainsMap = new Map();

    logs.forEach((log) => {
      const key = new Date(log.timestamp || Date.now()).toISOString().slice(0, 10);
      const prev = byDayMap.get(key) || { _id: key, count: 0, blocked: 0 };
      prev.count += 1;
      if (log.status === 'blocked') prev.blocked += 1;
      byDayMap.set(key, prev);

      if (log.status === 'blocked' && log.domain) {
        topDomainsMap.set(log.domain, (topDomainsMap.get(log.domain) || 0) + 1);
      }
    });

    const byDay = [...byDayMap.values()].sort((a, b) => a._id.localeCompare(b._id));
    const topDomains = [...topDomainsMap.entries()]
      .map(([domain, count]) => ({ _id: domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      total,
      blocked,
      allowed: total - blocked,
      byDay,
      topDomains,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

