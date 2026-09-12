import ghpages from "gh-pages";

// Remove inherited source-only dotfiles from the deployment clone, never the source checkout.
await new Promise((resolve, reject) =>
  ghpages.publish(
    "dist",
    {
      repo: "https://sankirtansyadavofficial-Hack@github.com/sankirtansyadavofficial-Hack/ThermalGuard.git",
      branch: "gh-pages",
      nojekyll: true,
      message: "Deploy ThermalGuard Earth explorer and district workspace",
      beforeAdd: (git) =>
        git.exec(
          "rm",
          "--ignore-unmatch",
          "-f",
          ".env.example",
          ".env.pages",
          ".gitignore",
          ".oxlintrc.json",
        ),
    },
    (error) => (error ? reject(error) : resolve()),
  ),
);
console.log("Published compiled site to sankirtansyadavofficial-Hack/ThermalGuard gh-pages.");
