require('dotenv').config();
const express = require("express");
const app = express();
const path = require('path');
const ejsMate = require("ejs-mate");
const User = require("./models/user");

const session = require("express-session") 
const MongoStore = require("connect-mongo")

require("./config/db");

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set("views",path.join(__dirname,"../frontend/views"));


app.use(express.static("../frontend/public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "NUIKzAgaj0",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions"
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 2
    }
}))

// import routes
// user routes 
const userRoutes = require("./routes/userRoutes");

app.use("/", userRoutes);


const port = 3000;

app.get("/",(req,res)=>{
    res.render("./index");
})
app.get("/db",async(req,res)=>{
    const users = await User.find({});
    res.render("./admin/db",{title:"DB | WhisperCloud",users});
})


app.use((req,res)=>{
    res.send("Page Not Found!")
})

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})