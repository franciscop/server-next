import server, { file } from "@server/next";

export default server()
  .get("/", () => file("index.html"))
  .post("/clicked", () => (
    <div>
      <button hx-post="/clicked" hx-swap="outerHTML">
        It works!
      </button>
      <div className="hello">With styles!</div>
      <style>{`
        .hello {
          background: red;
          color: white;
          padding: 2px;
        }
      `}</style>
    </div>
  ));
