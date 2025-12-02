export async function send(type,senderId,receiverId,payload){
  try{
        // Query backend to send a message
        await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type,
                senderId,
                receiverId,
                payload,
                status:"PENDING",
                timestamp:Date.now()
            }),
        });
  }
  catch(error){
      console.log("Error sending message, "+error);
  }
}