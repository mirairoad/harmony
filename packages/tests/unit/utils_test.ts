import { expect } from "@std/expect";
import { escapeScript, pathToExportName, UniqueNamer } from "../../core/utils.ts";

Deno.test("pathToExportName — strips extension and produces JS-safe identifier", () => {
  expect(pathToExportName("/islands/foo.tsx")).toBe("foo");
  expect(pathToExportName("/islands/nav-bar.tsx")).toBe("nav_bar");
  expect(pathToExportName("/islands/foo.v2.tsx")).toBe("foo_v2");
  expect(pathToExportName("/islands/_.$bar.tsx")).toBe("_$bar");
});

Deno.test("pathToExportName — leading digit is prefixed with underscore", () => {
  expect(pathToExportName("/islands/1.hello.tsx")).toBe("_hello");
});

Deno.test("UniqueNamer — disambiguates duplicates with suffix counter", () => {
  const u = new UniqueNamer();
  expect(u.getUniqueName("Foo")).toBe("Foo");
  expect(u.getUniqueName("Foo")).toBe("Foo_1");
  expect(u.getUniqueName("Foo")).toBe("Foo_2");
  expect(u.getUniqueName("Bar")).toBe("Bar");
});

Deno.test("UniqueNamer — sanitises non-ASCII identifiers", () => {
  const u = new UniqueNamer();
  expect(u.getUniqueName("foo bar")).toBe("foo_bar");
});

Deno.test("UniqueNamer — prefixes JS reserved words with underscore", () => {
  const u = new UniqueNamer();
  expect(u.getUniqueName("class")).toBe("_class");
  expect(u.getUniqueName("default")).toBe("_default");
});

Deno.test("escapeScript — escapes </script and </style", () => {
  expect(escapeScript("</script>")).toBe("<\\/script>");
  expect(escapeScript("</STYLE>")).toBe("<\\/STYLE>");
});

Deno.test("escapeScript — escapes <!-- with hex when not JSON", () => {
  expect(escapeScript("<!--")).toBe("\\x3C!--");
});

Deno.test("escapeScript — escapes <!-- as unicode when JSON", () => {
  expect(escapeScript("<!--", { json: true })).toBe("\\u003C!--");
});
