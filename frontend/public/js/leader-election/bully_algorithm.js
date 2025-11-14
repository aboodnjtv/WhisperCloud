  
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
  console.log("NEW leader is: "+user._id);
}


async function wait_for_oks() {
  const totalWait = 50000; // total 50 seconds
  const checkInterval = 5000; // check every 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < totalWait) {
    const ok_messages = await check_messages("OK", user._id);

    if (ok_messages && ok_messages.messages.length > 0) {
      console.log("✅ GOT OK, stopping early!");
      return ok_messages;
    }

    console.log("⏳ No OK yet, checking again...");
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return undefined;

  
}


async function wait_for_coordinator_messages() {
  // wait up to 80 seconds for a COORDINATOR
  const totalWait = 80000;
  const checkInterval = 5000;
  const startTime = Date.now();
  let coordinator_messages;

  while (Date.now() - startTime < totalWait) {
    coordinator_messages = await check_messages("COORDINATOR", user._id);
    if (coordinator_messages && coordinator_messages.messages.length > 0) {
      return coordinator_messages;
    }
    console.log("⏳ Still waiting for COORDINATOR...");
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return undefined;
  
}

  
  export async function start_leader_election(){
    try{
        console.log("leader election started")
        const higherPeers = user.peers.filter(peerId => peerId.toString() > user._id.toString());
        const lowerPeers = user.peers.filter(peerId => peerId.toString() < user._id.toString());
        // if it knows its id is the highest
        // it elects itself as coordinator, then sends a
        // Coordinator message to all processes with lower
        // identifiers. Election is completed.
        if(higherPeers.length === 0){
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
          console.log("waiting for Oks")
          const ok_messages = await wait_for_oks();
          // listen for OKs from those peers
          if(ok_messages && ok_messages.messages.length > 0){

            // wait for COORDINATOR within timeout //otherwise start election again
            console.log("✅ GOT OK — waiting for COORDINATOR messages...");
            
            const coordinator_messages = await wait_for_coordinator_messages();
            if (coordinator_messages) {
              console.log("🎉 GOT COORDINATOR message!");
              const new_leader_id = coordinator_messages.messages[0].payload.new_leader_id;
            await new Promise(resolve => setTimeout(resolve, 5000));
              await update_leader(user._id, new_leader_id);
              return;
            }
            else{
              // Timeout — no coordinator arrived
              // if an answer received however, then there is some 
              // nonfaulty higher process => so, wait for coordinator message.
              // If none received after another timeout, start a new
              // election run.
              console.log("❌ No COORDINATOR after 80s → Restart the election...");
              await new Promise(resolve => setTimeout(resolve, 5000));
              // start a new election
              await start_leader_election();
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