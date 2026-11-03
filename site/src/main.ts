// The start of the page: the theme, the three live views, the table of small parts and the build line.
import { byId, h, setupTheme } from "@mark1russell7/site-pages/chrome";
import "@fontsource-variable/fraunces/full.css";
import { ROWS } from "./live.ts";
import { RailView } from "./rail-view.ts";
import { SpongeView } from "./sponge-view.ts";
import "./style.css";
import { TileView } from "./tile-view.ts";

setupTheme(byId<HTMLButtonElement>("theme"), "funk-theme");
new RailView();
new TileView();
new SpongeView();

const SOURCE = "https://github.com/mark1russell7/Funk/blob/main/";

byId("parts").replaceChildren(
  ...ROWS.map((row) =>
    h(
      "tr",
      { "data-row": row.id },
      h("th", { scope: "row" }, h("a", { href: `${SOURCE}${row.file}` }, h("code", {}, row.name))),
      h("td", {}, row.what),
      h(
        "td",
        { class: "live" },
        ...row.examples.map((example) => h("div", { class: "ex" }, h("code", {}, example.code), h("output", {}, example.run()))),
      ),
    ),
  ),
);

byId("build").append("Build ", __BUILD__.sha === "local" ? "local" : h("a", { href: `https://github.com/mark1russell7/Funk/commit/${__BUILD__.sha}` }, __BUILD__.sha), ` of ${__BUILD__.date}`);
