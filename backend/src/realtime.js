let io = null;

function setIO(instance) {
  io = instance;
}

function emitEvent(event, payload, room = null) {
  if (!io) return;
  if (room) {
    io.to(String(room)).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

module.exports = { setIO, emitEvent };

