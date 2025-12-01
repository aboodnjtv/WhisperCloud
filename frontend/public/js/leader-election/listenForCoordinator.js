
import{check_messages} from "../utils/check_messages.js"
import{update_leader} from "../utils/update_leader.js"
const user = window.user;


// window.user is the current user
// Only run if a user session is active
if (window.user && window.user.type ==="peer") {
    const CHECK_INTERVAL_MS = 1000;   // how often to check

    // this function will listen for any COORDINATOR messages

    async function listenForCoordinator() {
        try {
            while (true) {
                // console.log(" -----------(( Listening For Coordinator ))------------")
                const coordinator_messages = await check_messages("COORDINATOR",user._id);
                if (coordinator_messages && coordinator_messages.messages.length > 0) {
                    const new_leader_id = coordinator_messages.messages[0].payload.new_leader_id;
                    
                    // with the communcation delay, if a lower id did not get the ok, and became a leader,
                    // it will not be set as a leader
                    // later on, a new election will occur
                    if(new_leader_id > user._id){ 
                        window.user.election_state = "DONE"; // Mark election as done
                        console.log("GOT COORDINATOR, NEW LEADER")
                        await new Promise(resolve => setTimeout(resolve, 5000)); // FOR TESTING
                        await update_leader(user._id, new_leader_id);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // check every 1000 ms

            }
        } catch (err) {
        console.error("Error listenForCoordinator:", err);
        }

    }
    listenForCoordinator();
 

}

