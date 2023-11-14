import mongoose from "mongoose";

async function connects(): Promise<void>{
  const dbUrl = "mongodb+srv://mongo:L925TblGciWYS4Lx@clusters0.zasrmm9.mongodb.net/expense-tracker-app-data?retryWrites=true&w=majority";
  await mongoose.connect(dbUrl).then(() => console.log("mongodb connected successfully"));
}