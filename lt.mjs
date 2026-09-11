import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { parseLesson } from "./src/lib/lesson-parser.ts";
const files = ["hello-world","base-values","base-symbols","base-strings","base-recursion","base-predicates","base-mutation","base-lists","base-lambda","base-higher-order","base-define","base-conditionals"];
for (const f of files) {
  const l = parseLesson(readFileSync(`./src/lessons/base/${f}.md`, "utf8"));
  console.log(l.order, l.id, l.title, "tests:", JSON.stringify(l.tests).length);
}
