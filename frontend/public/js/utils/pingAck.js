  // function for senderId to PING  receiverId
  export async function ping(senderId,receiverId){
    try{
        // Query backend to ping receiverId 
        await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type:"PING",
                senderId,
                receiverId,
                payload:{},
                status:"PENDING",
                timestamp:Date.now()
            }),
        });
        console.log(`Pinged: ${receiverId}`)
    }
    catch(error){
        console.log("Error Ping, ", error);
    }
  }

  export async function listen_for_ack(senderId,receiverId){
    // listen for ONLY ACK messages 
    const ack_response = await fetch("/listen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:"ACK",
            senderId,
            receiverId,
          }),
        });
        const data = await ack_response.json();

        return data.messages.length !== 0;
  }