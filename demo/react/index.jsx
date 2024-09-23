import server from "../../";
import Home from "./Home";

export default server().get("/", () => <Home />);
