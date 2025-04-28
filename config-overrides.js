module.exports = function override(config, env) {
  // Remove source-map-loader from the rules
  config.module.rules = config.module.rules.filter(rule => 
    !rule.use || (Array.isArray(rule.use) && !rule.use.some(loader => 
      typeof loader === 'object' && loader.loader === 'source-map-loader'
    ))
  );
  
  // Add fallbacks for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "http2": false,
    "url": require.resolve("url/"),
    "zlib": require.resolve("browserify-zlib"),
    "querystring": require.resolve("querystring-es3"),
    "stream": require.resolve("stream-browserify"),
    "net": false,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "os": require.resolve("os-browserify/browser")
  };
  
  return config;
}
