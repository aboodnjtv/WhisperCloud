import {ping, listen_for_ack} from "./utils/pingAck.js";
import {getAdmins, getPeers} from "./utils/fetchUsers.js";

/**
 * Listens for an admin node to initiate a broadcast
 */
window.addEventListener("DOMContentLoaded", () => {
    if(window.user && user.type === "admin") {
        console.log("Listening for messages from a system administrator...")
        listenForPing()
    }
    const form = document.getElementById("broadcastForm")
    if (!form) return
    form.addEventListener("submit", logSubmit)
})

/**
 * Initiator node uses ping-ack protocol to check admin liveness before broadcast
 * @param {SubmitEvent} event - Broadcast form submission
 */
async function logSubmit(event) {
    event.preventDefault()

    const form = event.target
    const message = form.user_message.value 

    if (message !== "") {
        const initiatorID = user._id
        const currentAdmins = await getAdmins()
        const currentPeers = await getPeers() 
        const liveAdmins = [initiatorID]

        for (let admin of currentAdmins) {
            const receiverID = admin._id

            // 1. Initiator fires initial ping
            // 2. Initiator listens for an ack from the receiving admin
            // 3. Count the receiving admin as live if it sends back an ack
            if (receiverID !== initiatorID) {
                let ackStatus = false
                try {
                    await ping(initiatorID, receiverID)
                    ackStatus = await checkForAck(initiatorID, receiverID)
                } catch (error) {
                    ackStatus = false
                    console.warn(`Admin node ${receiverID} is not live.`, error)
                }
                if (ackStatus) liveAdmins.push(receiverID)
            }
        }

        // Create broadcast message to send to initator's peers
        const adminMessage = {
            payload: {
                content: message,
                liveAdmins: liveAdmins,
                currentPeers: currentPeers
            }
        }

        // Initiator now broadcasts message to only live admins
        for (let adminID of liveAdmins) {
            if (adminID !== initiatorID) {
                await broadcastToAdmin(initiatorID, adminID, adminMessage.payload)
            }
        }

        // Send broadcast message to initiator's peers
        const res = await calculateRange(adminMessage, initiatorID)
        await pushMessage(res.startIndex, res.endIndex, res.content, res.currentPeers)
    }
}

/**
 * Continously polls for either a ping or broadcast message from an admin node
 */
async function listenForPing() {
    const TIMEOUT_DURATION = 5000
    const RETRY_DURATION = 10000
    
    while (true) {
        try {
            const response = await fetch("/listen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    types: ["PING", "BROADCAST"],
                    receiverId: user._id
                })
            })

            if (!response.ok) {
                throw new Error(`Response status ${response.status}`)
            }
            const data = await response.json();

            // 1. For ping messages: receivers will send acknowledgments back to the initiator
            // 2. For broadcast messages: receivers will disseminate the message to their respective peers
            if (data.messages.length > 0) {
                for (let adminMessage of data.messages) {
                    if (adminMessage.type === "PING") {
                        await sendAck(adminMessage.receiverId, adminMessage.senderId)
                    } else if (adminMessage.type === "BROADCAST") {
                        const res = await calculateRange(adminMessage, user._id)
                        await pushMessage(res.startIndex, res.endIndex, res.content, res.currentPeers)
                    }
                }
            } 
            console.debug("Current listening cycle has completed. Next cycle begins in 2 seconds.")
            await new Promise(r => setTimeout(r, TIMEOUT_DURATION))
        } catch(error) {
            console.error("Neither ping nor broadcast message was heard. Retrying after 15 seconds.", error)
            await new Promise(r => setTimeout(r, RETRY_DURATION))
        }
    }
}

/**
 * Enables admin nodes to broadcast their messages to other admin nodes
 * @param {string} senderID - ID of broadcast initiator node
 * @param {string} receiverID - ID of admin node that receives broadcast
 * @param {string} message - Broadcast message
 * @returns {{ok: boolean}} - True if broadcast to live admins is succesful, false otherwise
 */
async function broadcastToAdmin(senderID, receiverID, message) {
    try {
        const response = await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type:"BROADCAST",
                senderId: senderID,
                receiverId: receiverID,
                payload: message,
                status:"PENDING",
                timestamp:Date.now()
            }),
        });

        if (!response.ok) {
            throw new Error(`Response status ${response.status}`)
        }

        console.debug(`Broadcast from ${senderID} to ${receiverID} was succesful.`)
        return { ok: true }
    } catch (error) {
        console.error(`Broadcast from ${senderID} to ${receiverID} failed after all retries.`, error)
        return { ok: false, error: new Error("Broadcast to live admins failed.") }
    }
}

/**
 * Calculates the range of peers that should be assigned to each receiver node
 * @param {string} adminMessage - Message that initiator admin wishes to broadcast
 * @param {string} receiverID - The ID that will receive the broadcast and forward it to its peers
 * @returns {object} - startIndex, endIndex, content, and currentPeers
 */
async function calculateRange(adminMessage, receiverID) {
    const { content, liveAdmins, currentPeers } = adminMessage.payload
    
    const numPeers = currentPeers.length
    const numLiveAdmins = liveAdmins.length
    let adminIndex = 0

    // Determines the position of the admin in the database
    for (let i = 0; i < liveAdmins.length; i++) {
        if (liveAdmins[i] === receiverID) adminIndex = i + 1
    }

    // # of peers each admin is responsible for
    // In cases of uneven distribution of peers, some admins will be responsible for more peers
    const offset = Math.ceil(numPeers / numLiveAdmins) 

    // Start index: Arithmetic sequence formula
    // End index: We use Math.min to ensure that the endIndex does not exceed # of peers
    const startIndex = 1 + ((adminIndex - 1) * offset)
    const endIndex = Math.min(startIndex + offset - 1, numPeers)

    return {startIndex, endIndex, content, currentPeers}
}

/**
 * Pushes broadcast message to each peer's local array
 * Each admin is responsible for only a certain range of peers
 * @param {number} startIndex - First peer in the range to receive the message
 * @param {number} endIndex - Last peer in the range to receive the message
 * @param {string} content - Message that initiator admin wishes to broadcast
 * @param {Array<string>} currentPeers - Contains IDs of all peers in the system
 * @returns {{ok: boolean}} - True if all the messages were disseminated to the peers succesfully, false otherwise
 */
async function pushMessage(startIndex, endIndex, content, currentPeers) {
    console.log(`Message delivery to peers underway: Admin ${user._id} is sending the message "${content}" from peers ${startIndex} to ${endIndex}. Total peers: ${endIndex - startIndex + 1}.`);
    var isDelivered = true

    for (let j = startIndex; j <= endIndex; j++) {
        const peerID = currentPeers[j - 1]._id
        const messageID = crypto.randomUUID() // Generate a random message ID for a message

        try {
            const response = await fetch("/push-message", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ peerID, content, messageID })
            })

            if (!response.ok) {
                throw new Error(`Response status ${response.status}`)
            }
            
            console.debug(`Succesfully delivered broadcast message to ${peerID}.`)
        } catch (error) {
            console.error(`Failed to deliver broadcast message from peers ${startIndex} to ${endIndex}.`, error)
            isDelivered = false
        }
    }

    return { ok : isDelivered }
}

/**
 * // Function to send an ACK message from receiver to initiator
 * @param {string} senderID - ID of the node that sends the ACK message
 * @param {string} receiverID  - ID of the node that should receive the ACK message
 * @returns {{ok: boolean}} - True if ACK was delivered succesfully, false otherwise
 */
async function sendAck(senderID,receiverID) {
    try {
        const response = await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "ACK",
                senderId: senderID,
                receiverId: receiverID,
                payload: {},
                status: "PENDING",
                timestamp: Date.now()
            })
        })

        if (!response.ok) {
            throw new Error(`Response status ${response.status}`) 
        }

        console.debug(`ACK message was delivered succesfully from ${receiverID} to ${senderID}.`)
        return { ok: true }
    } catch (error) {
        console.error(`ACK message was not delivered succesfully from ${receiverID} to ${senderID}.`)
        return { ok: false }
    }
}

/**
 * Broadcast initiator polls receiving admin nodes for an acknowledgement of the ping
 * @param {string} senderID - ID of node that initiated the broadcast
 * @param {string} receiverID  - ID of node that should send the ACK message back
 * @returns {boolean} - True if the ACK message was received within the max # of retries
 */
async function checkForAck(senderID, receiverID) {
    const MAX_RETRIES = 5
    const TIMEOUT_DURATION = 5000

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
            const res = await listen_for_ack(receiverID, senderID)
            if (res) {
                console.log(`Success! ACK message was received from ${receiverID}`)
                return true
            }
        } catch (error) {
            console.error(`ACK message was not received from ${receiverID}.`, error)
        }

        await new Promise(r => setTimeout(r, TIMEOUT_DURATION))
    }
    console.warn(`ACK message was not received from ${receiverID}. All retries are complete.`)
    return false
}