import server from "../../";

const home = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HTMX Experiment</title>
</head>
<body>
  <button hx-post="/clicked" hx-swap="outerHTML">
    Click Me
  </button>
  <script src="https://unpkg.com/htmx.org@2"></script>
</body>
</html>`;

export default server()
  .get("/", () => home)
  .post("/clicked", () => <div>It works!</div>);
