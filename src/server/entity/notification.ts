import mongoose from "../mongoose";

const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    userid: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    webhook: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('notification', NotificationSchema);