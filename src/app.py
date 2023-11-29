from flask import Flask, render_template # Se usa para renderizar la página HTML en el navegador del cliente
import socketio # Se usa para comunicarse con el cliente
import random # Se usa para generar números aleatorios
import threading # Se usa para ejecutar múltiples hilos de ejecución
import time # Se usa para pausar la ejecución del programa

app = Flask(__name__)
sio = socketio.Server(cors_allowed_origins="*")
app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app)

# Configuración para archivos estáticos
app.static_folder = "static"

# Mantener un registro de todas las balotas anunciadas
balotas_anunciadas = set()

# Mantener un conjunto de clientes conectados
clientes_conectados = set()

# Evento para señalizar el inicio del juego
inicio_juego_evento = threading.Event()

# Mantener el ID de sesión del cliente que controla el juego
control_sid = None
# Mantener un conjunto de números de cartón generados
numeros_cartones = set()
# Ganador
ganador = None


# Funciona para generar un número de cartón aleatorio sin repetir
def generar_numero_carton():
    # Generar un solo número aleatorio que no haya sido generado antes
    numero = random.randint(1, 100)
    while numero in numeros_cartones:
        numero = random.randint(1, 100)

    # Agregar el número generado al conjunto de números de cartón
    numeros_cartones.add(numero)

    return numero


# Función para generar un cartón aleatorio
def generar_carton():
    carton = {
        "B": random.sample(range(1, 16), 5),
        "I": random.sample(range(16, 31), 5),
        "N": random.sample(range(31, 46), 5),
        "G": random.sample(range(46, 61), 5),
        "O": random.sample(range(61, 76), 5),
    }
    return carton


# Ruta principal que renderiza la página HTML
@app.route("/")
def index():
    return render_template("index.html")


# Ruta para la página de control del juego
@app.route("/start")
def start():
    return render_template("start.html")


# Manejar la señal para iniciar el juego desde el cliente
@sio.event
def iniciar_juego_desde_cliente(sid):
    iniciar_juego(sid)


# Ruta para obtener una nueva balota
@app.route("/nueva_balota")
def nueva_balota():
    letra = ""
    numero = -1
    while True:
        letra = random.choice(["B", "I", "N", "G", "O"])
        if letra == "B":
            numero = random.randint(1, 15)
        elif letra == "I":
            numero = random.randint(16, 30)
        elif letra == "N":
            numero = random.randint(31, 45)
        elif letra == "G":
            numero = random.randint(46, 60)
        else:  # letra == 'O'
            numero = random.randint(61, 75)

        if letra + str(numero) not in balotas_anunciadas:
            break

    # Agregar la nueva balota al registro
    balotas_anunciadas.add(letra + str(numero))

    return letra + str(numero)


# Manejar la conexión de un nuevo cliente
@sio.event
def connect(sid, environ):
    print(f"Cliente conectado: {sid}")
    clientes_conectados.add(sid)
    sio.emit("numero_carton", {"numero": generar_numero_carton()}, room=sid)
    sio.emit("actualizar_carton", {"carton": generar_carton()}, room=sid)
    sio.emit("nueva_balota", {"balota": ""}, room=sid)


# Manejar la desconexión de un cliente
@sio.event
def disconnect(sid):
    print(f"Cliente desconectado: {sid}")
    clientes_conectados.remove(sid)


# Manejar la señal para comenzar el juego
@sio.event
def iniciar_juego(sid):
    global control_sid
    control_sid = sid
    global inicio_juego_evento
    sio.emit("status", {"status": "STARTING..."}, room=sid)
    time.sleep(1)
    sio.emit("status", {"status": "3"}, room=sid)
    time.sleep(1)
    sio.emit("status", {"status": "2"}, room=sid)
    time.sleep(1)
    sio.emit("status", {"status": "1"}, room=sid)
    time.sleep(1)
    sio.emit("status", {"status": "GO"}, room=sid)
    inicio_juego_evento.set()  # Establecer el evento para indicar que el juego ha comenzado
    sio.emit("status", {"status": "READY"}, room=list(clientes_conectados))
    return


@sio.event
def detener_juego(sid):
    global control_sid
    control_sid = sid
    global inicio_juego_evento
    inicio_juego_evento.clear()
    sio.emit("status", {"status": "STOP"}, room=list(clientes_conectados))
    return


@sio.event
def nuevo_juego(sid):
    global control_sid
    control_sid = sid
    global inicio_juego_evento
    inicio_juego_evento.clear()
    global ganador
    ganador = None
    global balotas_anunciadas
    balotas_anunciadas = set()
    global numeros_cartones
    numeros_cartones = set()
    # Refrescar pagina de los  clientes
    sio.emit("refrescar", room=list(clientes_conectados))
    sio.emit("status", {"status": "NEW GAME"}, room=sid)
    return

@sio.event
def resultado_bingo(sid, data):
    bingo = data.get("bingo", False)
    numero_carton = data.get("numero_carton", -1)
    global ganador
    if bingo:
        ganador = sid
        sio.emit("status", {"status": f"¡BINGO! #{numero_carton}"}, room=control_sid)
        print(f"¡Bingo! Cartón #{numero_carton} ha ganado.")


if __name__ == "__main__":
    # Iniciar un hilo para generar y compartir balotas

    def generar_y_compartir_balotas():
        while True:
            # Comprobar si el evento de inicio del juego está activado
            if inicio_juego_evento.is_set() and ganador is None:
                # Generar una nueva balota
                balota = nueva_balota()

                # Compartir la balota con todos los clientes
                sio.emit(
                    "nueva_balota", {"balota": balota}, room=list(clientes_conectados)
                )
                sio.emit("status", {"status": balota}, room=control_sid)
                # Esperar antes de generar la siguiente balota
                time.sleep(1)

                # Balotas generadas
                sio.emit(
                    "balotas_generadas",
                    {"balotas": list(balotas_anunciadas)},
                    room=control_sid,
                )

    # Iniciar el hilo para generar y compartir balotas y cartones de bingo aleatorios entre los clientes
    threading.Thread(target=generar_y_compartir_balotas).start()

    # Iniciar el servidor Flask con socket.io
    app.run(debug=True, threaded=True)
