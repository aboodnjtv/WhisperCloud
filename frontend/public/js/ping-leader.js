import {ping ,lsiten_for_ack} from "../utils/pingAck";



// window.user is the current user
// Only run if a user session is active
if (window.user) {
  // Configuration (you can tweak these)
  const CHECK_INTERVAL_MS = 3000;   // how often to check leader
  const STALE_THRESHOLD_MS = 10000;  // if leader hasn't updated in this many ms -> considered dead

  let waitingForReply = false;
  let lastPingTime = Date.now();

  // function to ensure peer knows who the leader is
  const check_leader_existence = () => {
    if (!user.leaderId) {
      console.warn("No leader assigned to this peer yet.");
      setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep checking later
      return false;
    }
    return true;
  };

  // function to ensure the current user is NOT the leader
  const check_current_user_is_not_leader = () => {
    if (user.leaderId === user._id) {
      console.warn("You are the Leader.");
      setTimeout(checkLeader, CHECK_INTERVAL_MS); // keep checking later
      return false;
    }
    return true;
  };

 
  

  // function to start the leader election
  // algorithm: bully algorithm
  const start_leader_election = async()=>{
    /// -------
    // Start election
    // await fetch("/start-election", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    // });
    /// -------
  }


  const checkLeader = async () => {
    try {

      if (!check_leader_existence() || !check_current_user_is_not_leader()) return;

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
        const leader_ack = await lsiten_for_ack(user.leaderId,user._id);
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

          await start_leader_election();
        
          // Wait 30s before next check
          const randomDelay = 30000 + Math.floor(Math.random() * 10000); // 30–40 seconds
          return setTimeout(checkLeader, randomDelay);

        }
        setTimeout(checkLeader, CHECK_INTERVAL_MS);

      }

    } catch (err) {
      console.error("Error checking leader:", err);
    }
  };


  checkLeader();


}
