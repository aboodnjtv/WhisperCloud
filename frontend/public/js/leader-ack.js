if (window.user && user.isLeader) {
  const CHECK_MESSAGES_MS = 2000; // how often the leader checks for new messages


  // async function to get PING messages
  const get_leader_ping_messages = async()=>{
    // fetch pending ping messages from DB 
    const res = await fetch("/check-leader-ping-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderId: user._id }),
    });

    const data = await res.json();
    return data;
    // console.log("👑 👑 👑 👑 👑 MESSAGES 👑 👑 👑 👑 👑 ");
    // console.log(data);
  };

  // async function to reply with ACK

  const reply_to_ping_message = async(senderId ,receiverId)=>{
    // reply with ACK message
    console.log(`📨 Received ping from ${receiverId}`);
    await fetch("/reply-leader-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        senderId,
        receiverId,
        type: "ACK",
        }),
    });
  }


  async function check_leader_ping_messages() {
    try {
        const leader_ping_messages = await get_leader_ping_messages();
        
        if (leader_ping_messages.messages && leader_ping_messages.messages.length > 0) {
            // reply with ACK for each PING message
            for (const msg of leader_ping_messages.messages) {
                await reply_to_ping_message(user._id,msg.senderId);
            }
        }

    } catch (err) {
      console.error("Leader ACK check error:", err);
    }
    // schedule next check
    setTimeout(check_leader_ping_messages, CHECK_MESSAGES_MS);
  }

  check_leader_ping_messages();
}
