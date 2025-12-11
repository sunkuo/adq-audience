import mongoose from "../mongoose";

const Schema = mongoose.Schema;

const SettingSchema = new Schema(
  {
    userid: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    value: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('setting', SettingSchema);