import reset from "./reset.js";

const Card = ({ children }) => <p>{children}</p>;
Card.Text = ({ children }) => <p>{children}</p>;

const Page = ({ children }) => (
  <html>
    <body>
      <article>{children}</article>
    </body>
  </html>
);

export default function Home() {
  return (
    <Page>
      <style>{reset}</style>
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
      <div>
        <a href="/hello">Go to see some design</a>
      </div>
      <Card.Text>Some more weird stuff</Card.Text>
      <script>{`
        console.log("Hello world");
      `}</script>
    </Page>
  );
}
