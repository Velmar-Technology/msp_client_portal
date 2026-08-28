module.exports.readVersion = function (contents) {
  const match = contents.match(/^version\s*=\s*"([^"]+)"/m);
  return match ? match[1] : '';
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
};
