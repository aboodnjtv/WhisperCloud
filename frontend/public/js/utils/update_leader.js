export async function update_leader(userId,newLeaderId){
  try{
      // Query backend to update the leader 
      await fetch("/update_leader", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              userId,
              newLeaderId,
          }),
      });
    location.reload(); // reload page to show updated leader UI

  }
  catch(error){
      console.log("Error update_leader, "+error);
  }

}