import mongoose, { Schema, Document, Model } from "mongoose";

const monthsEnum = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const expensesSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  month: {
    type: String,
    required: true,
    validate: {
      validator: function (value: String) {
        return monthsEnum.includes(value.toUpperCase())
      },
      message: props => `${props.value} is not a valid month.`,
    }
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
