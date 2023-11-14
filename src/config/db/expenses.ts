import mongoose, { Schema, Document, Model } from "mongoose";

const expensesSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  personExpenses: [
    {
      personName: {
        type: String,
        required: true,
      },
      personExpense: {
        type: [
          {
            money: Number,
            tag: String,
          },
        ],
        required: true
      }
    },
  ],

});


const Expense = mongoose.model("expenses", expensesSchema);

export default Expense;
