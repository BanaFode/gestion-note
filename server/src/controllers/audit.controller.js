import AuditLog from '../models/AuditLog.js';

export const getAuditLogsController = async (req, res) => {
   const query = {};
   for (const field of ['actor', 'action', 'entityType', 'entityId']) {
      if (req.query[field]) query[field] = req.query[field];
   }

   const parsedLimit = Number.parseInt(req.query.limit, 10);
   const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;
   const logs = await AuditLog.find(query)
      .populate('actor', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit);

   return res.status(200).json({ success: true, data: logs });
};
