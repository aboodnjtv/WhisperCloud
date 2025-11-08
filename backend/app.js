require('dotenv').config();
const express = require("express");
const app = express();
const path = require('path');
const ejsMate = require("ejs-mate");
const User = require("./models/user");
const session = require("express-session") 

require("./config/db");

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set("views",path.join(__dirname,"../frontend/views"));


app.use(express.static("../frontend/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
}));


app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


// import routes
// user routes 
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const pageRoutes = require("./routes/pageRoutes");

app.use("/", userRoutes);
app.use("/", messageRoutes);
app.use("/", pageRoutes);


const port = 3000;

app.get("/",(req,res)=>{
    res.render("./index");
})
app.get("/db", async (req, res) => {
  const admins = await User.find({ type: "admin" });
  const peers = await User.find({ type: "peer" });

  res.render("./admin/db", {
    title: "DB | WhisperCloud",
    admins,
    peers,
    adminCount: admins.length,
    peerCount: peers.length
  });
});

app.use((req,res)=>{
    res.send("Page Not Found!")
})

app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
})