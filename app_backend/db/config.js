const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI,{
    serverSelectionTimeoutMS: 30000, // Adjust the timeout as needed
})
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log("Error connecting to MongoDB:");
    console.log(err);
});