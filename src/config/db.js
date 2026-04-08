const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}`,
    );

    console.log("MONGO DB CONNECTED", connectionInstance.connection.host);
  } catch (error) {
    console.log("error connected db", error);
    process.exit(1);
  }
};

module.exports = connectDB;
