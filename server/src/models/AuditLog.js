import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
   {
      actor: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
         index: true,
      },
      action: {
         type: String,
         required: true,
         trim: true,
         index: true,
      },
      entityType: {
         type: String,
         required: true,
         trim: true,
      },
      entityId: {
         type: mongoose.Schema.Types.ObjectId,
         required: true,
         index: true,
      },
      oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
      newValue: { type: mongoose.Schema.Types.Mixed, default: null },
      reason: { type: String, trim: true, default: '' },
   },
   { timestamps: true }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
