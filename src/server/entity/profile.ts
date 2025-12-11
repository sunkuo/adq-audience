import mongoose from "../mongoose";

const Schema = mongoose.Schema;

const ProfileSchema = new Schema(
  {
    userid: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, default: "" },
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model('profile', ProfileSchema);