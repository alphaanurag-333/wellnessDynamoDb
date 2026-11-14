/** @type {import("socket.io").Server | null} */
let ioInstance = null;

function setRealtimeIo(io) {
  ioInstance = io || null;
}

function getRealtimeIo() {
  return ioInstance;
}

module.exports = { setRealtimeIo, getRealtimeIo };
