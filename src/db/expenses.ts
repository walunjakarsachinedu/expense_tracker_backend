import mongoose, { Schema } from "mongoose";
import { PersonTx } from "../api/schema/type";

const personSchema = new Schema<
  PersonTx & { userId: mongoose.Schema.Types.ObjectId }
>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  month: {
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
  name: String,
  txs: {
    type: [
      {
        _id: String,
        index: Number,
        money: Number,
        tag: String,
      },
    ],
    required: true,
  },
});

const Person = mongoose.model<
  PersonTx & { userId: mongoose.Schema.Types.ObjectId }
>("persons", personSchema);

export default Person;
