
import{check_messages} from "../utils/check_messages.js"
import{send} from "../utils/send.js"

const user = window.user;

// window.user is the current user
// Only run if a user session is active
if (window.user && window.user.type ==="peer") {
    const CHECK_INTERVAL_MS = 1000;   // how often to check

    // this function will listen for any OK messages

    async function listenForOk() {
        try {
            while (true) {

                if(window.user.election_state ==="WAIT_OK"){
                    console.log(" --(( Listening For OK ))--"+ window.user.election_state)
                    const ok_messages = await check_messages("OK", user._id);
                    if (ok_messages && ok_messages.messages.length > 0) {
                        console.log("✅ GOT OK, stopping early!");
                        window.user.election_state ="WAIT_COORDINATOR";
                    }
                    console.log("⏳ No OK yet, checking again...");
                }
                await new Promise(resolve => setTimeout(resolve, 1000));


            }
        } catch (err) {
        console.error("Error listenForOk:", err);
        }

    }
    listenForOk();
 

}

