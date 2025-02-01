import server, { redirect } from "../../";
import { s3 } from "bun";

// Automatically upload and serve assets from S3
export default server({ public: s3, uploads: s3 })
  .get("/", () => (
    <form action="/" method="POST" enctype="multipart/form-data">
      <input name="profile" type="file" />
      <button>Upload</button>
    </form>
  ))
  .post("/", ({ body }) => redirect(`/${body.profile}`));
