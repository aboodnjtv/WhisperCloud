/**
 * Fetch all the administrators that have created an account with WhisperCloud
 * @returns Array of all the admins in the database
 */
export async function getAdmins() {
    const res = await fetch ("/retrieve-admins", {
        method: "GET",
        headers: {"Content-Type": "application/json"}
    })
    return await res.json();
}

/**
 * Fetch all the peers that have created an account with WhisperCloud
 * @returns Array of all the peers in the database
 */
export async function getPeers() {
    const res = await fetch ("/retrieve-peers", {
        method: "GET",
        headers: {"Content-Type": "application/json"}
    })
    return await res.json();
}