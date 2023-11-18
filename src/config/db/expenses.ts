import mongoose, { Schema, Document, Model } from "mongoose";

const monthsEnum = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const expensesSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  year: {
    type: Number,
    validate: {
      validator: function (year) {
        return year >= 2000 && year << 2100;
      },
      message: props => 'year should be between 2000 & 2100',
    }
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
      _id: String,
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
