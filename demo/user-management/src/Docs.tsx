// Scalar reads the generated spec straight from /openapi.json
export default function Docs() {
  return (
    <html lang="en">
      <head>
        <title>User management API</title>
        <meta charset="utf-8" />
      </head>
      <body>
        <script id="api-reference" data-url="/openapi.json"></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  );
}
