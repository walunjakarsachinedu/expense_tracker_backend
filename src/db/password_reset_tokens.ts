import mongoose, { Schema } from "mongoose";
import { PasswordResetToken } from "../api/schema/type";

const passwordResetTokenSchema = new Schema<PasswordResetToken>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  resetCode: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  expireIn: {
    type: Number,
    required: true,
  },
  // One-time token for this password reset session
  nonce: {
    type: String,
    required: true,
  },
});

const PasswordResetTokenModel = mongoose.model<PasswordResetToken>(
  "password_reset_tokens",
  passwordResetTokenSchema
);

export default PasswordResetTokenModel;
