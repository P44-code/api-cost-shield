const mongoose = require("mongoose");

async function connectDB() {

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("database connected successfully")
    }
    catch (error) {
        console.log("database connection failed", error)
        console.log(error.message)
    }


}

module.exports = connectDB;