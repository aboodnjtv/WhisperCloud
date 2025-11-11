  
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

  
  export async function start_leader_election(){
    try{
        /// -------
        // Start election
        // await fetch("/start-election", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        // });
        /// -------


        console.log("leader election started")
        const higherPeers = user.peers.filter(peerId => peerId.toString() > user._id.toString());
        const lowerPeers = user.peers.filter(peerId => peerId.toString() < user._id.toString());
        let timeout = false;
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
          // listen for OKs from those peers
          // const delay = 3000 + Math.floor(Math.random() * 18000); // 3–20 seconds
          const delay = 50000 + Math.floor(Math.random() * 5000); // 3-6 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
          const ok_messages = await check_messages("OK",user._id);
          console.log("ok_messages:::: ")
          console.log(ok_messages.messages)
          if(ok_messages && ok_messages.messages.length  > 0){
            // wait for COORDINATOR within timeout //otherwise start election again
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            console.log("GOT OK yaaaaay !!!!!!!!!!!!!!!!")
            await new Promise(resolve => setTimeout(resolve, 50000));
            // check for coordinator messages
            const coordinator_messages = await check_messages("COORDINATOR",user._id);

            // if no coordinator messages restart the election
            if (coordinator_messages && coordinator_messages.messages.length > 0) {
              console.log("GOT coordinator_messages");
              console.log(coordinator_messages);
              const new_leader_id = coordinator_messages.messages[0].payload.new_leader_id;
              await update_leader(user._id,new_leader_id)
              console.log("new_leader_id: "+new_leader_id);
              return;
          }else{
            console.log("no COORDINATOR messages")
          }
            
          }
          else{
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            console.log("XXXXXXXXXX")
            await new Promise(resolve => setTimeout(resolve, 5000));
            await send_coordinator_messages(lowerPeers);
          }


          // if receives no answer within timeout, calls itself leader
          // and sends Coordinator message to all lower id processes.
          // Election completed.

          // if(timeout){
          //   for(let lowerPeerId of lowerPeers){
          //     await send("COORDINATOR",user._id,lowerPeerId)
          //   }
          // }

          // if an answer received however, then there is some 
          // nonfaulty higher process => so, wait for coordinator message.
          // If none received after another timeout, start a new
          // election run.

          // if(timeout){
          //   await start_leader_election();
          // }
          


        }

        


    }
    catch(error){
        console.log("Error start_leader_election, "+error);
    }
  }