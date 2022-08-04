import color from "./color.js";

const isProduction = process.env.NODE_ENV === "production";

const header = function ({ api, options }) {
  if (isProduction) return;
  const routes = Object.values(api).flat().length;
  console.clear();
  console.log(
    color(
      `{green}Started server successfully{/} (${routes} routes). See app in the browser:

🔗 {under}http://localhost:${options.port}/{/}

{dim}Press [ctrl+c] to exit the server.{/}
`
    )
  );
};

export default { header };
