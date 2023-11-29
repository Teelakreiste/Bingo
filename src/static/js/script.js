// Conectar al servidor de socket.io
var socket = io.connect('http://' + document.domain + ':' + location.port);

// Guardar el cartón generado
var cartonGenerado = {
    "B": [],
    "I": [],
    "N": [],
    "G": [],
    "O": [],
}

// Guardar numeros del carton generado
var numero_carton = -1;

// Guardar las balotas anunciadas
var balotas_anunciadas = [];

// Guardar el estado del juego
var ganador = false;

// Manejar el evento de actualización de cartón
socket.on('actualizar_carton', function (data) {
    cartonGenerado = data.carton;
    mostrarCarton(data.carton);

    // Emitir evento de generar cartón
    socket.emit('carton', { carton: cartonGenerado });
});

// Manejar el evento del numero del cartón
socket.on('numero_carton', function (data) {
    mostrarNumeroCarton(data.numero);
});

// Manejar el evento de nueva balota
socket.on('nueva_balota', function (data) {
    mostrarBalota(data.balota);
    balotas_anunciadas.push(data.balota);
    verificar_bingo();
});

socket.on('refrescar', function () {
    window.location.reload();
});

function mostrarNumeroCarton(numero) {
    // Agregar el número al cartón generado al título de la página
    document.getElementById('numero_carton').innerText = numero;
    // Agregar el número al cartón generado al titulo de la página
    document.title = 'Bingo - ' + numero;
    numero_carton = numero;
}

function mostrarCarton(carton) {
    var table = document.getElementById('carton');
    table.innerHTML = '<tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>';

    // Obtener la cantidad máxima de números en una columna
    var maxColumnCount = Math.max(...Object.values(carton).map(fila => fila.length));

    // Iterar sobre cada número en las columnas
    for (var i = 0; i < maxColumnCount; i++) {
        var row = table.insertRow(-1);

        // Iterar sobre las letras y agregar el número a la celda
        for (var letra in carton) {
            var fila = carton[letra];
            var cell = row.insertCell(-1);

            // Agregar el número si existe en la fila, o un espacio en blanco si no
            cell.innerHTML = fila[i] !== undefined ? fila[i] : '';
            cell.id = letra + (fila[i] !== undefined ? fila[i] : '');  // Agregar identificador a la celda
        }
    }
}

function mostrarBalota(balota) {
    var numero = parseInt(balota.substring(1)); // Obtener el número de la balota como entero
    var cartonRows = document.getElementById('carton').rows;

    // Buscar la celda correspondiente y aplicar un estilo
    for (var i = 1; i < cartonRows.length; i++) {
        var cells = cartonRows[i].cells;
        for (var j = 0; j < cells.length; j++) {
            var cellNumero = parseInt(cells[j].innerHTML);
            if (cellNumero === numero) {
                cells[j].style.backgroundColor = '#FF5733';
            }
        }
    }

    document.getElementById('balota').innerText = balota;
}

// En el lado del cliente (página HTML con JavaScript)
function verificar_bingo() {
    // Cartón generado
    carton = cartonGenerado;

    // Verificar filas
    var bingoFilas = verificarFilas(carton);

    // Verificar columnas
    var bingoColumnas = verificarColumnas(carton);

    // Verificar si hay bingo en alguna fila o columna
    var bingo = bingoFilas || bingoColumnas;

    ganador = bingo;

    // Emitir evento de resultado de bingo y número de cartón
    socket.emit('resultado_bingo', { bingo: bingo, numero_carton: numero_carton });
}

function verificarTablaLlena(carton) {

    // Verificar si hay un bingo
    var bingo = true;
    for (var letra in carton) {
        for (var i = 0; i < carton[letra].length; i++) {
            var numero = letra + carton[letra][i];
            if (!balotas_anunciadas.includes(numero)) {
                bingo = false;
                break;
            }
        }
        if (!bingo) {
            document.getElementById("gana").style.display = "block";
            break;
        }
    }

    return bingo;
}


function verificarFilas(carton) {
    for (var letra in carton) {
        var filaCompleta = true;
        for (var i = 0; i < carton[letra].length; i++) {
            var numero = letra + carton[letra][i];
            if (!balotas_anunciadas.includes(numero)) {
                filaCompleta = false;
                break;
            }
        }
        if (filaCompleta) {
            document.getElementById("gana").style.display = "block";
            return true; // Bingo en la fila
        }
    }
    return false; // Ningún bingo en filas
}

function verificarColumnas(carton) {
    for (var i = 0; i < 5; i++) {
        var columnaCompleta = true;
        for (var letra in carton) {
            var numero = letra + carton[letra][i];
            if (!balotas_anunciadas.includes(numero)) {
                columnaCompleta = false;
                break;
            }
        }
        if (columnaCompleta) {
            document.getElementById("gana").style.display = "block";
            return true; // Bingo en la columna
        }
    }
    return false; // Ningún bingo en columnas
}