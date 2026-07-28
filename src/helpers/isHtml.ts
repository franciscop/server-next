// Whether a string body should be sent as HTML instead of plain text. It must
// open with something tag-like: a tag name, a closing tag, or a doctype/comment.
// A bare '<' isn't enough, or text like "<3 you all" would be sent as markup
// (and rendered as such when it comes from user input).
const TAG = /^\s*<[a-zA-Z!/]/;

export default function isHtml(body: string): boolean {
  return TAG.test(body);
}
