function log(caller, ...args) {
  const callerName = caller.name || caller;
  console.log(`%c${callerName}`, 'color: #0f0;', ...args);
}

log.error = function(caller, ...args) {
  const callerName = caller.name || caller;
  console.log(`%c${callerName}`, 'color: #f00;', ...args);
}

export default log;