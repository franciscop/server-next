fetch("/query?hello=world", { method: "POST" })
  .then((res) => res.json())
  .then((data) => console.log(data));
fetch("/json", {
  method: "POST",
  body: JSON.stringify({ hello: "world" }),
  headers: { "Content-Type": "application/json" },
})
  .then((res) => res.json())
  .then((data) => console.log(data));

fetch("/logo.png")
  .then((res) => res.blob())
  .then((blob) => {
    const form = new FormData();
    form.append("hello", "world");
    form.append(
      "bio",
      new File(["# Hello world\n\nThese are the results..."], "results.txt", {
        type: "text/plain",
      })
    );

    form.append("profile", new File([blob], "icon.png", { type: "image/png" }));
    fetch("/multipart", {
      method: "POST",
      body: form,
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  });

fetch("/example.md");
