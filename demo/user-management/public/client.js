// Submit the add-user form to the API as JSON instead of a browser POST,
// so the page refreshes with the new row instead of displaying the response
const form = document.querySelector("form[action='/api/users']");
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const res = await fetch(form.action, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  if (!res.ok) return alert(`Could not add the user (${res.status})`);
  location.reload();
});

// The per-row Delete buttons, with a confirmation before calling the API
document.addEventListener("click", async (event) => {
  const id = event.target.dataset?.delete;
  if (!id) return;
  if (!confirm("Delete this user? This cannot be undone.")) return;
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) return alert(`Could not delete the user (${res.status})`);
  location.reload();
});
