// Only run if user is the leader
if (window.user && window.user.isLeader) {
    const FETCH_INTERVAL_MS = 30000; // 30 seconds
    
    /**
     * Leader fetches from pages and initiates gossip
     */
    async function leaderFetchAndGossip() {
        try {
            console.log("Leader: Fetching from pages...");
            
            const response = await fetch("/gossip/fetch-and-start", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`✓ Initiated gossip for ${data.messagesCount} page updates`);
            } else {
                console.log("No updates to gossip");
            }
            
        } catch (error) {
            console.error("Leader gossip error:", error);
        }
        
        setTimeout(leaderFetchAndGossip, FETCH_INTERVAL_MS);
    }
    
    console.log("Leader: Starting gossip protocol...");
    leaderFetchAndGossip();
}