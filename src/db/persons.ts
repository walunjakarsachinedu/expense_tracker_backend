import mongoose, { Schema } from "mongoose";
import { PersonTx } from "../api/schema/type";

const personSchema = new Schema<PersonTx>({
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
  type: {
    type: String,
    enum: ["Expense", "Income"],
  },
  index: {
    type: Number,
    required: true,
  },
  name: String,
  txs: {
    type: [
      {
        _id: {
          type: String,
          required: true,
        },
        index: {
          type: Number,
          required: true,
        },
        money: Number,
        tag: String,
        performedAt: Number,
      },
    ],
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
});

const Person = mongoose.model<PersonTx>("persons", personSchema);

export default Person;
