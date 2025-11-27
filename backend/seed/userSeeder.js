require('dotenv').config({ path: '../.env' });
const User = require("../models/user");
require("../config/db");
const bcrypt = require("bcrypt");


const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Common password
    const hashedPassword = await bcrypt.hash("a", 12);

    const users = [];

    // --- Create 3 Admins ---
    for (let i = 1; i <= 3; i++) {
      users.push({
        name: `Admin_${i}`,
        email: `admin${i}@whispercloud.com`,
        password: hashedPassword,
        type: "admin",
        isLeader: false,
        isOnline: true,
        bcastId: Number(100 + i),
      });
    }

    // --- Create 9 Peers ---
    for (let i = 1; i <= 9; i++) {
      users.push({
        name: `Peer_${i}`,
        email: `peer${i}@whispercloud.com`,
        password: hashedPassword,
        type: "peer",
        isLeader: false,
        isOnline: true,
        bcastId: Number(i),
      });
    }

    // Insert all users
    const insertedUsers = await User.insertMany(users);
    console.log("Inserted users into DB");

    // --- Assign whisId and randomly choose a leader peer ---
    const peerUsers = insertedUsers.filter(u => u.type === "peer");
    const randomLeader = peerUsers[Math.floor(Math.random() * peerUsers.length)];

    for (const user of insertedUsers) {
      user.whisId = user._id.toString();
      user.leaderId = randomLeader._id;
      if (user._id.equals(randomLeader._id)) {
        user.isLeader = true;
      }
      await user.save();
    }

    // --- Connect all peers to each other ---
    for (const peer of peerUsers) {
      peer.peers = peerUsers
        .filter(p => !p._id.equals(peer._id))
        .map(p => p._id);
      await peer.save();
    }

    console.log(`Assigned leader: ${randomLeader.name}`);
    console.log("Seeding complete!");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding users:", err);
    process.exit(1);
  }
};

seedUsers();
