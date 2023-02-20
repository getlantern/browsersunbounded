const {resolve} = require("path")
const GlobEntriesPlugin = require("webpack-watched-glob-entries-plugin")

module.exports = {
    webpack: (config, { dev, vendor }) => {
        const src = "app"
        const entries = [
            resolve(src, "*.{js,mjs,jsx,ts,tsx}"),
            resolve(src, "?(scripts)/*.{js,mjs,jsx,ts,tsx}"),
        ];
        return ({
            ...config,
            entry: GlobEntriesPlugin.getEntries(entries),
            resolve: {
                ...config.resolve,
                extensions: [...config.resolve.extensions, ".ts", ".tsx"],
            },
            module: {
                ...config.module,
                rules: [...config.module.rules, {test: /\.tsx?$/, loader: "ts-loader"}],
            }
        })
    },
}