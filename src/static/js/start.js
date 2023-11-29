// Conectar al servidor de socket.io
var socket = io.connect('http://' + document.domain + ':' + location.port);

// Mostrar balotas generadas al inicio
socket.on('balotas_generadas', function (data) {
    mostrarBalotas(data.balotas);
});

function iniciarJuego() {
    socket.emit('iniciar_juego');
}

function detenerJuego() {
    socket.emit('detener_juego');
}

function nuevoJuego() {
    // Vaciar balotas anunciadas
    balotas_anunciadas = [];
    // Emitir evento de nuevo juego
    socket.emit('nuevo_juego');
}

// Manejar el evento de estado
socket.on('status', function (data) {
    if (data && data.status) {
        mostrarEstado(data.status);
    } else {
        console.error('Datos de estado no válidos:', data);
    }
});

function mostrarEstado(estado) {
    var elemento = document.getElementById('status');
    if (elemento) {
        elemento.innerHTML = estado;
    } else {
        console.error('Elemento "status" no encontrado en el DOM');
    }
}

function mostrarBalotas(balotas) {
    var elemento = document.getElementById('balotas');
    if (elemento) {
        elemento.innerHTML = balotas.join(', ');
    } else {
        console.error('Elemento "balotas" no encontrado en el DOM');
    }
}

// Manejar errores de conexión Socket.io
socket.on('connect_error', function (error) {
    console.error('Error de conexión Socket.io:', error);
});