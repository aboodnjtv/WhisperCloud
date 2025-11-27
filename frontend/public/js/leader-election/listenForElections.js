
import{check_messages} from "../utils/check_messages.js"
import{send} from "../utils/send.js"

// window.user is the current user
// Only run if a user session is active
if (window.user) {
    // Configuration (you can tweak these)
    const CHECK_INTERVAL_MS = 1000;   // how often to check

    
    // this function will listen for any later ELECTION messages
    // if current election_state = wait, AND still get election
    // messsages, just reply with OK, until they get COORDINATOR message 

    async function listenForElections() {
        try {
            while (true) {
                if(window.user.election_state === "WAIT"){
                    // The current peer is waiting for OK or COORDINATOR messsage
                    // so if another peer sends an ELECTION message to this peer
                    // just reply with OK --> so it also waits for COORDINATOR messsage
                    console.log(" -----------(( Listening For Elections ))------------")
                    const election_messages = await check_messages("ELECTION",user._id);
                    if (election_messages && election_messages.messages.length > 0) {
                        // console.log("GOT election_messages");
                        // console.log(election_messages.messages);
                        //send OK the the senderId
                        for(let msg of election_messages.messages){
                            let senderId = msg.payload.senderId;
                            await send("OK",user._id,senderId);
                            // console.log("Sent ((OK)) to "+senderId)
                        }
                    }
                    
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // check every 1000 ms

            }
        } catch (err) {
        console.error("Error checking leader:", err);
        }

    }
    listenForElections();
 

}

