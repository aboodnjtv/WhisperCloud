const mongoose = require('mongoose');
const MONGODB_URI =process.env.MONGODB_URI;
const connectToDB = async()=>{
    try{
        await mongoose.connect(MONGODB_URI);
        console.log("Database is connected");
    }
    catch(error){
        console.log("Error !! DB Not Connected!");
        console.log(error);
    }
}

connectToDB();