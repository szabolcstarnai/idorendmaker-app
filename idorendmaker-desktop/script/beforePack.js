exports.default = async function () {
  const newInstallNshPath = path.resolve(__dirname, '../build/myInstallSection.nsh');
  const destNshPath = path.resolve(__dirname, '../node_modules/app-builder-lib/templates/nsis/installSection.nsh');
  fs.renameSync(newInstallNshPath, destNshPath);
}