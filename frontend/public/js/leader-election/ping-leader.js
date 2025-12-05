import {ping ,listen_for_ack} from "../utils/pingAck.js";
import {start_leader_election} from "./bully_algorithm.js";
const user = window.user;

// window.user is the current user
// Only run if a user session is active
if (window.user && window.user.type ==="peer") {

  // only matters if current user was/still the leader 
  // Detect actual login vs refresh
  let justLoggedIn = !sessionStorage.getItem("alreadyLoaded"); //initially, justLoggedIn = ture
  
  if(user.leaderId === user._id){
    console.log("Leader Just LoggedIn: Starting Election ")
  }
  // Mark that the page has been loaded once
  sessionStorage.setItem("alreadyLoaded", "true"); // on logout, it be cleared 

  // Configuration 
  const CHECK_INTERVAL_MS = 1000;   // how often to check leader
  const STALE_THRESHOLD_MS = 10000;  // if leader hasn't updated in this many ms -> considered dead

  let waitingForReply = false;
  let lastPingTime = Date.now();

  // function to ensure peer knows who the leader is
  const check_leader_existence = async() => {
    if (!user.leaderId) {
      console.warn("No leader assigned to this peer yet.");
      // if it does not know any leader, start election
      await start_leader_election();
      setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep checking later
      return false;
    }
    return true;
  };

  // function to ensure the current user is NOT the leader
  const check_current_user_is_not_leader = async() => {
    if (user.leaderId === user._id) {
      console.warn("You are the Leader.");

      // if you (leader) have just logged in 
      // start a new election
      if (justLoggedIn) {
        console.log("Just logged in as leader → starting election");
        await start_leader_election();
        }

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
        // await ping(user._id,user.leaderId);
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
          waitingForReply = false; // reset to try again or trigger election


          const delay = 5000 + Math.floor(Math.random()*5000);
          await new Promise(resolve => setTimeout(resolve, delay));

          console.log("Starting election");
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
