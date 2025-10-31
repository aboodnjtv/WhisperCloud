// window.user is the current user

// this interval to update the lastSeet of the current user

if(window.user){
  setInterval(() => {
    fetch("/update-last-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: window.user._id }) //send the user’s ID

    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update last seen");
      //   console.log("Last seen updated");
      })
      .catch((err) => console.error("Error updating last seen:", err));
  }, 3000);
}
