const Card = ({ children }) => <p>{children}</p>;
Card.Text = ({ children }) => <p>{children}</p>;

const css = `
body {
  background: #eee;
}
`;

export default function Home() {
  return (
    <article>
      <style>{css}</style>
      <h1 id="hello" className="Hello">
        Hello world
      </h1>
      <p>
        This is some <strong>basic</strong> test with{" "}
        <a
          href="https://francisco.io/"
          onClick={(e) => {
            e.preventDefault();
            alert("Hello world");
          }}
        >
          a link
        </a>{" "}
        and{" "}
        <>
          a <sub>small</sub> fragment
        </>
        !
      </p>
      <p id={`world "'> quote`}>
        HTML {"<strong>gets escaped</strong>"} properly.
      </p>
      <Card.Text>Some more weird stuff</Card.Text>
    </article>
  );
}
