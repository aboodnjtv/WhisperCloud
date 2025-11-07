// function to PING the leader
  // triggers the backend to send a message to the leader
  export async function ping_leader(){
    try{
        // Query backend to ping leader
        await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type:"PING",
                senderId: user._id,
                receiverId: user.leaderId,
                payload:{},
                status:"PENDING",
                timestamp:Date.now()
            }),
        });
        console.log("Pinged leader :) ")
    }
    catch(error){
        console.log("Error Ping, "+error);
    }
    // return setTimeout(checkLeader, CHECK_INTERVAL_MS);
  }

  export async function lsiten_for_ack(senderId,receiverId){
    // listen for ONLY ACK messages 
    const Leader_ACK_response = await fetch("/listen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:"ACK",
            senderId,
            receiverId,
          }),
        });
        const data = await Leader_ACK_response.json();
        // if the messages is 0 then there are no ack found 
        return data.messages.length !== 0;

  }