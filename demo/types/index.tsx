import server from "../../";

export default server()
  .get("/", () => "Hello world")
  .get("/hello", () => <div>Hello world</div>);
