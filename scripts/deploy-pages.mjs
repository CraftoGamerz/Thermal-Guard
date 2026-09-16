import ghpages from "gh-pages";

// Remove inherited source-only dotfiles from the deployment clone, never the source checkout.
await new Promise((resolve, reject) =>
  ghpages.publish(
    "dist",
    {
      repo: "https://github.com/sankirtansyadavofficial-Hack/Thermal-Guard.git",
      branch: "gh-pages",
      nojekyll: true,
      message: "Deploy ThermalGuard resilient GIS workspace",
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
