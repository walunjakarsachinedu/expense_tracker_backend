import mongoose, { Schema } from "mongoose";
import { MonthNotesDB } from "../api/schema/type";

const monthNotesSchema = new Schema<MonthNotesDB>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  month: {
    /** format: MM-yyyy */
    type: String,
    required: true,
    validate: {
      validator: function (value: String) {
        // valid format .e.g., 01-2025
        const MMyyyy = /^(0[1-9]|1[0-2])-([2-9]\d{3})$/;
        return value.match(MMyyyy);
      },
      message: (props) => `${props.value} is not a valid month.`,
    },
  },
  notes: {
    type: String,
  },
  version: {
    type: String,
    required: true,
  },
});

/** Mongoose model to work with monthly monthlyNotes collection. */
const MonthlyNotesModel = mongoose.model<MonthNotesDB>("monthlyNotes", monthNotesSchema);

export default MonthlyNotesModel;