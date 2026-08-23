import server from "../../";
import { ServerStyleSheet } from "styled-components";
import { styled, getStyles } from "./ssr.jsx";

const Title = styled.h1`
  font-size: 2rem;
  color: tomato;
`;

const Button = styled.button`
  background: ${(p) => (p.$primary ? "tomato" : "white")};
  color: ${(p) => (p.$primary ? "white" : "tomato")};
  border: 2px solid tomato;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
`;

const Grid = styled.div`
  display: flex;
  gap: 12px;
`;

export default server().get("/", () => {
  const Styled = getStyles(new ServerStyleSheet());

  return (
    <Styled>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Styled Components SSR</title>
        </head>
        <body>
          <Title>Hello from styled-components</Title>
          <Grid>
            <Button>Normal</Button>
            <Button $primary>Primary</Button>
          </Grid>
        </body>
      </html>
    </Styled>
  );
});
