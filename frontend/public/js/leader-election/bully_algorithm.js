  
import{send} from "../utils/send.js"
import{update_leader} from "../utils/update_leader.js"
import{check_messages} from "../utils/check_messages.js"


async function send_coordinator_messages(lowerPeers) {
  // this peer is the leader
  for(let lowerPeerId of lowerPeers){
    // send coordinator message
    const payload = {
      new_leader_id: user._id
    }
    await send("COORDINATOR",user._id,lowerPeerId,payload)
  }

  await update_leader(user._id,user._id);
}


async function wait_for_oks() {
  const totalWait = 50000; // total 50 seconds
  const checkInterval = 5000; // check every 5 seconds
  const startTime = Date.now();

  //window.user.election_state  could chage to WAIT_COORDINATOR or "DONE" while waiting for OKs 
  while (Date.now() - startTime < totalWait) {
    if(window.user.election_state === "DONE" ||  window.user.election_state === "WAIT_COORDINATOR"){
      return true;  
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return false;

}


async function wait_for_coordinator_messages() {
  // wait up to 80 seconds for a COORDINATOR
  const totalWait = 80000;
  const checkInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < totalWait) {
    if(window.user.election_state === "DONE"){
      return true;  
    }
    
    console.log("⏳⏳⏳ waiting for COORDINATOR...");
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return false;
  
}

  
  export async function start_leader_election(){
    try{
        window.user.election_state ="ELECTION_RUNNING";
        console.log("leader election started")
        const higherPeers = user.peers.filter(peerId => peerId.toString() > user._id.toString());
        const lowerPeers = user.peers.filter(peerId => peerId.toString() < user._id.toString());
        // if it knows its id is the highest
        // it elects itself as coordinator, then sends a
        // Coordinator message to all processes with lower
        // identifiers. Election is completed.
        if(higherPeers.length === 0){
          window.user.election_state = "DONE"; // leader election is done 
          await send_coordinator_messages(lowerPeers);
        }
        else{
          //it initiates an election by sending an
          // Election message
          // Sends it to only processes that have a higher id than
          // itself.
          console.log("NOT highest ID!")

          for(let higherPeerId of higherPeers){
            const payload = {
              senderId: user._id
            }
            await send("ELECTION",user._id,higherPeerId,payload)
            console.log(`Sent ELECTION to ${higherPeerId}`)
          }
          // wait for OKs
          
          console.log("waiting for Oks")
          // change the sate to WAIT_OK 
          window.user.election_state = "WAIT_OK";
          const ok_messages = await wait_for_oks();
          // listen for OKs from those peers
          if(ok_messages ){

            // wait for COORDINATOR within timeout //otherwise start election again
            console.log("✅ GOT OK — waiting for COORDINATOR messages...");
            
            const coordinator_messages = await wait_for_coordinator_messages();

            if(!coordinator_messages){
              console.log("❌ No COORDINATOR after 80s → Restart the election...");
              await new Promise(resolve => setTimeout(resolve, 5000));
              //to prevent restarting the election if a coordinator message has already been processed
              if(window.user.election_state !== "ELECTION_RUNNING" ||
                        window.user.election_state !== "WAIT_OK"||
                        window.user.election_state !== "WAIT_COORDINATOR"
                ){
                // start the election
                await start_leader_election();
              }
            }


          }else{
            // if receives no answer within timeout, calls itself leader
            // and sends Coordinator message to all lower id processes.
            // Election completed.
            console.log("❌ No OKS → becoming leader...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            await send_coordinator_messages(lowerPeers);
          }
        }

        

    }
    catch(error){
        console.log("Error start_leader_election, "+error);
    }
  }