import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: (v: any) => /^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
    },
  },
  password: {
    type: String,
    required: true,
    validate: {
      validator: (v: any) =>
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
    },
  },
});

const User = mongoose.model("users", userSchema);

export default User;
