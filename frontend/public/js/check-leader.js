// window.user is the current user

// Only run if a user session is active
if (window.user) {
  // Configuration (you can tweak these)
  const CHECK_INTERVAL_MS = 5000;   // how often to check leader
  const STALE_THRESHOLD_MS = 5000;  // if leader hasn't updated in this many ms -> considered dead

  setInterval(async () => {
    try {
      console.log("Checking on the leader...",);

      // Ensure leaderId is known for this peer
      if (!user.leaderId) {
        console.warn("No leader assigned to this peer yet.");
        return;
      }
      // leader does not check itself
      if (user.leaderId == user._id) {
        console.warn("You are the Leader.");
        return;
      }

      // Query backend for the leader's lastSeen timestamp
      const response = await fetch("/leader-last-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderId: user.leaderId }),
      });

      const data = await response.json();
      if (!data.success) {
        console.warn("Leader check failed:", data.error);
        //start a new election
        await fetch("/start-election", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return;
      }

      const leaderLastSeen = new Date(data.leaderLastSeen);
      const now = new Date();
      const diff = now - leaderLastSeen;

      // Compare timestamps
      if (diff > STALE_THRESHOLD_MS) {
        console.warn(
          `⚠️ Leader is unresponsive! Last seen ${diff}ms ago. Triggering election...`
        );

        // Start election
        await fetch("/start-election", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } else {
        console.log("✅ Leader alive, last seen", diff, "ms ago");
      }
    } catch (err) {
      console.error("Error checking leader:", err);
    }
  }, CHECK_INTERVAL_MS);
}
