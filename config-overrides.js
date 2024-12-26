module.exports = function override(config, env) {
  // Remove source-map-loader from the rules
  config.module.rules = config.module.rules.filter(rule => 
    !rule.use || (Array.isArray(rule.use) && !rule.use.some(loader => 
      typeof loader === 'object' && loader.loader === 'source-map-loader'
    ))
  );
  return config;
}
