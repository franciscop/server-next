# Plugins vs Middleware

There are two available ways to add options, one is through plugins and another is through middleware. You can think as plugins as more advanced middleware and with a better integration with Server, BUT they are also limited to what Server supports natively. Middleware are very similar toExpress and other generic frameworks:

```js
// Middlware examples
export default server()
  .use(middleware1)
  .get('/', getHelloCb)
  .post('/hello', middleware2, addHelloCb);

// Plugins examples ("auth" + "schema" + "custom" here):
export default server({
  auth: { type: "jwt", providers: ["github"] },
  schema: { file: './openapi.json' },
  custom: { id: 'abcdefg' }
})
  // Define the EXTRA plugins at the root level
  .plugin({ name: 'custom', options: { id: 'string' }, ... })

  // Overwrite the plugin config for this specific route
  .get('/', { auth: false }, getHelloCb)
  .post('/hello', addHelloCb)

  .router('/admin/', adminRoutes);

// Same as before, as plain plugins:
export default server()
  // Define the plugins at the root level
  .plugin({ auth: { type: "jwt", providers: ["github"] }})
  .plugin({ schema: { file: './openapi.json' }})
  .plugin({ custom: { options: {}, before: cb1, after: cb2 }})

  // Overwrite the plugin config for this specific route
  .get('/', { auth: false }, getHelloCb)
  .post('/hello', addHelloCb);

```
