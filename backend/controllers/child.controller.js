const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');

const COLLECTION = 'childProfiles';

const defaultCustomSettings = () => ({
  blockAdult: true,
  blockViolence: true,
  blockGambling: false,
  blockSocialMedia: false,
  safeSearchLevel: 'moderate',
});

const defaultTimeRestrictions = () => ({
  enabled: false,
  schedule: [],
  dailyLimitMinutes: 0,
});

const normalizeSites = (sites) => {
  if (!Array.isArray(sites)) return undefined;
  const cleaned = sites
    .map((site) => String(site || '').trim().toLowerCase())
    .map((site) => site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set(cleaned)];
};

const withId = (doc) => ({
  _id: doc.id,
  id: doc.id,
  ...doc.data(),
});

exports.addChild = async (req, res) => {
  try {
    const { name, filteringLevel } = req.body;
    const deviceId = uuidv4();
    const now = Date.now();

    const child = {
      parentId: req.user.uid,
      name: String(name || '').trim(),
      deviceId,
      filteringLevel: filteringLevel || 'moderate',
      isActive: true,
      customSettings: defaultCustomSettings(),
      allowedSites: [],
      blockedSites: [],
      timeRestrictions: defaultTimeRestrictions(),
      createdAt: now,
      updatedAt: now,
    };

    const ref = await getDb().collection(COLLECTION).add(child);
    return res.status(201).json({ child: { _id: ref.id, id: ref.id, ...child }, deviceId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.listChildren = async (req, res) => {
  try {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .where('parentId', '==', req.user.uid)
      .get();

    const children = snapshot.docs
      .map(withId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.json({ children });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getChild = async (req, res) => {
  try {
    const doc = await getDb().collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Child profile not found' });

    const child = withId(doc);
    if (child.parentId !== req.user.uid) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    return res.json({ child });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateChild = async (req, res) => {
  try {
    const ref = getDb().collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Child profile not found' });

    const child = withId(doc);
    if (child.parentId !== req.user.uid) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    const update = { updatedAt: Date.now() };

    if (typeof req.body.name === 'string') update.name = req.body.name.trim();
    if (typeof req.body.filteringLevel === 'string') update.filteringLevel = req.body.filteringLevel;
    if (typeof req.body.isActive === 'boolean') update.isActive = req.body.isActive;
    if (typeof req.body.customSettings === 'object' && req.body.customSettings) {
      update.customSettings = req.body.customSettings;
    }
    if (typeof req.body.timeRestrictions === 'object' && req.body.timeRestrictions) {
      update.timeRestrictions = req.body.timeRestrictions;
    }

    const allowedSites = normalizeSites(req.body.allowedSites);
    const blockedSites = normalizeSites(req.body.blockedSites);
    if (allowedSites) update.allowedSites = allowedSites;
    if (blockedSites) update.blockedSites = blockedSites;

    await ref.set(update, { merge: true });
    const updated = await ref.get();
    return res.json({ child: withId(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.removeChild = async (req, res) => {
  try {
    const ref = getDb().collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Child profile not found' });

    const child = withId(doc);
    if (child.parentId !== req.user.uid) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    await ref.delete();
    return res.json({ message: 'Child profile removed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getChildSettingsByDevice = async (req, res) => {
  try {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .where('deviceId', '==', req.params.deviceId)
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(404).json({ error: 'Device not registered' });

    const child = withId(snapshot.docs[0]);
    if (child.isActive === false) return res.status(404).json({ error: 'Device not registered' });

    return res.json({
      filteringLevel: child.filteringLevel || 'moderate',
      customSettings: child.customSettings || defaultCustomSettings(),
      allowedSites: child.allowedSites || [],
      blockedSites: child.blockedSites || [],
      timeRestrictions: child.timeRestrictions || defaultTimeRestrictions(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

