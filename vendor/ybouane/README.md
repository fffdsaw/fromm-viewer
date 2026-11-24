# ybouane LiquidGlass WebGL renderer

Source: [@ybouane/liquidglass 1.0.3](https://www.npmjs.com/package/@ybouane/liquidglass/v/1.0.3), published git revision `2c8ff3de131fbd29e34ce389979f8d025a61c1a9`. The upstream README and package metadata declare MIT. The npm SHA-512 integrity is `Ro/Q3vaEduvj1yUp/TVz9AYmxY+cYhnBj76eJ/Y9VQoPlRA0DWrKPQufEzrDSYzAWXL3qxiFibi5XQVW/egTnA==`.

`GlassRenderer.js`, `defaults.js` and `shaders.js` came from the published `dist` directory. Debug source-map references were removed. The shader confines biconvex refraction to the bevel, leaves the centre transparent, and omits global depth brightening. The renderer's framebuffer cache evicts old sizes. The Viewer supplies the backdrop sample for each surface through `web-glass-backdrop.js`.
