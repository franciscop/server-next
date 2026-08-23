import server from "@server/next";
import styled, { global, Styles } from "./lib";

// Rules that cannot belong to a class: element defaults, @font-face
global`
  body { margin: 0; font: 16px/1.5 system-ui, sans-serif; }
`;

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
  cursor: pointer;
`;

// Extending emits ONE class with the base's rules first, so this overrides them
const Next = styled(Button)`
  &::after { content: " \2192"; }
`;

// A component resolves to its own selector inside another's CSS, which is what
// makes this menu work with no JavaScript at all
const Menu = styled.nav`
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.2s;
`;

const Toggle = styled.input`
  &:checked ~ ${Menu} { max-height: 10rem; }
`;

const Grid = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
`;

export default server()
  .get("/", () => (
    <Styles>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Styled</title>
        </head>
        <body>
          <Grid>
            <Title>Hello</Title>
          </Grid>
          <Grid>
            <Button>Normal</Button>
            <Button $primary>Primary</Button>
            <Next $primary>Extended</Next>
          </Grid>
          <Grid>
            <label>
              <Toggle type="checkbox" /> Menu
              <Menu>
                <a href="/">One</a> <a href="/">Two</a>
              </Menu>
            </label>
          </Grid>
        </body>
      </html>
    </Styles>
  ))

  // A fragment has no <head>, so it carries only the rules it needs, inline.
  // That is what makes this work with htmx swaps.
  .get("/fragment", () => (
    <Styles>
      <Button $primary>Swapped in</Button>
    </Styles>
  ));
