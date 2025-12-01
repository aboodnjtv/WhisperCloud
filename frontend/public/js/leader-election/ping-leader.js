import {ping ,listen_for_ack} from "../utils/pingAck.js";
import {start_leader_election} from "./bully_algorithm.js";
import { check_messages } from "../utils/check_messages.js";
import{update_leader} from "../utils/update_leader.js"
import{send} from "../utils/send.js"
const user = window.user;

// window.user is the current user
// Only run if a user session is active
if (window.user && window.user.type ==="peer") {


  // only matters if you are the leader 
  // Detect actual login vs refresh
  let justLoggedIn = !sessionStorage.getItem("alreadyLoaded"); //initially, justLoggedIn = ture
  console.log("--------------")
  console.log("--------------")
  console.log("--------------")
  console.log("--------------")
  console.log("justLoggedIn: "+justLoggedIn)
  console.log(user)
  // Mark that the page has been loaded once
  sessionStorage.setItem("alreadyLoaded", "true"); // on logout, it be cleared 

  // Configuration 
  const CHECK_INTERVAL_MS = 1000;   // how often to check leader
  const STALE_THRESHOLD_MS = 10000;  // if leader hasn't updated in this many ms -> considered dead

  let waitingForReply = false;
  let lastPingTime = Date.now();

  // function to ensure peer knows who the leader is
  const check_leader_existence = () => {
    if (!user.leaderId) {
      console.warn("No leader assigned to this peer yet.");
      // start election
      setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep checking later
      return false;
    }
    return true;
  };

  // function to ensure the current user is NOT the leader
  const check_current_user_is_not_leader = async() => {
    if (user.leaderId === user._id) {
      console.warn("You are the Leader.");

      // if you have just logged in 
      // start a new election
      if (justLoggedIn) {
        console.log("Just logged in as leader → starting election");
        await start_leader_election();
        }

      // check for any election
      // const election_messages = await check_messages("ELECTION",user._id);
      // console.log("LEADER ELECTION messages")
      // console.log(election_messages.messages)

      setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep checking later
      return false;
    }
    return true;
  };

  const checkLeader = async () => {
    try {

      if (!check_leader_existence() || ! await check_current_user_is_not_leader()) return;

      // if user is not waiting for reply, Ping leader
      if(!waitingForReply){
        await ping(user._id,user.leaderId);
        waitingForReply = true;
        // we start measuring form here
        lastPingTime = Date.now();
        setTimeout(checkLeader, CHECK_INTERVAL_MS);
      }
      // else, Check if leader replied
      else{
        // check if leader ACK came
        const leader_ack = await listen_for_ack(user.leaderId,user._id);
        // if got an ACK, leader is alive
        if(leader_ack){
          console.log("✅ Leader is ALIVE");
          waitingForReply = false; // so that we staring Pinging again
          lastPingTime = Date.now();
        }
        // waited for too long with no ACK
        // declare leader has failed 
        // start the election
        else if (Date.now() - lastPingTime > STALE_THRESHOLD_MS) {
          console.log("❌ Leader has FAILED -> start election");
          waitingForReply = false; // reset to try again or trigger election


          const delay = 5000 + Math.floor(Math.random() * 18000);
          // const delay = 3000 + Math.floor(Math.random() * 3000); // 3-6 seconds
          await new Promise(resolve => setTimeout(resolve, delay));

          console.log("Starting election");
          
          // Check if someone else already started or won the election
          // const coordinator_messages = await check_messages("COORDINATOR",user._id);
          // const election_messages = await check_messages("ELECTION",user._id);
          
          // // coordinator_messages
          // if (coordinator_messages && coordinator_messages.messages.length > 0) {
          //   console.log("GOT coordinator_messages");
          //   console.log(coordinator_messages);
          //   const new_leader_id = coordinator_messages.messages[0].payload.new_leader_id;
          //   window.user.election_state = undefined; // leader election is done 
          //   await update_leader(user._id,new_leader_id)
          //   return setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep monitoring
          // }else{
          //   console.log("no COORDINATOR messages")
          // }

          // // election_messages
          // if (election_messages && election_messages.messages.length > 0) {
          //   console.log("GOT election_messages");
          //   console.log(election_messages.messages);
          //   // const senderId = coordinator_messages.messages[0].payload.senderId;
          //   //send OK the the senderId
          //   for(let msg of election_messages.messages){
          //     let senderId = msg.payload.senderId;
          //     await send("OK",user._id,senderId);
          //     console.log("Sent ((OK)) to "+senderId)
          //     window.user.election_state = "WAIT"; // so if later got another ELECTION, it will respond to it.
          //   }
          //   // start your leader election 
          //   await start_leader_election();
          //   return setTimeout(checkLeader, 1000);

          // }else{
          //   console.log("no ELECTION messages")
          // }

          // no COORDINATOR / ELECTION messages
          if(window.user.election_state !== "ELECTION_RUNNING" ||
                        window.user.election_state !== "WAIT_OK"||
                        window.user.election_state !== "WAIT_COORDINATOR"
            ){
            // start the election
            await start_leader_election();
          }
          
          return setTimeout(checkLeader, 1000);

        }
        setTimeout(checkLeader, CHECK_INTERVAL_MS);

      }

    } catch (err) {
      console.error("Error checking leader:", err);

    }
  };


  checkLeader();


}
