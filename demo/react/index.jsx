import server from "../../";
import Home from "./Home.jsx";
import styled from "./styled.jsx";

const Container = styled.div`
  display: flex;
  gap: 4px;
`;

const Button = styled.button`
  background: red;
  color: white;
  padding: 6px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
`;

const DynButton = styled.button`
  color: white;
  padding: 6px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  background: ${(p) => (p.$active ? "#faa" : "#fcc")};
`;

export default server()
  .get("/", () => <Home />)
  .get("/hello", () => (
    <div>
      <div>Hello world</div>
      <Container>
        <Button>Click me</Button>
        <Button>Click me</Button>
        <Button>Click me</Button>
        <DynButton>Click me</DynButton>
        <DynButton $active>Click me</DynButton>
      </Container>
    </div>
  ));
