export async function check_messages(type,receiverId) {
    // listen for "COORDINATOR", "ELECTION" messages 
    const messages = await fetch("/listen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            receiverId,
          }),
        });
    const data = await messages.json();
    // console.log(`check_messages (${type}): `)
    // console.log(data)
    // console.log(`-----------------------------`)

    return data; // or true if found
}
