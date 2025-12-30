from decimal import Decimal, InvalidOperation
from db import get_session
from models import PagoMovil, PagoValidado
from flask import request, jsonify, Flask
import threading
import time
from sync_service import sync_gmail
import uuid
import os
# AGREGAMOS ESTOS DOS IMPORTS
from datetime import datetime
import pytz

app = Flask(__name__)

# Sincronización en segundo plano
def sync_background():
    try:
        sync_gmail()
    except Exception as e:
        print(f"Error en sincronización en segundo plano: {e}")

@app.route("/api/pagos/sync", methods=["POST"])
def sincronizar_desde_app():
    threading.Thread(target=sync_background).start()
    return jsonify({"status": "Sincronización iniciada en segundo plano"}), 200

@app.route("/api/pagos/validar_en_gmail")
def validar_en_gmail():
    referencia_fin = request.args.get("referencia_fin")
    banco_origen = request.args.get("banco_origen")
    monto_raw = request.args.get("monto")
    usuario_nombre = request.args.get("usuario_nombre") or "Usuario App"

    if not referencia_fin or not banco_origen or not monto_raw:
        return jsonify({"error": "Parámetros incompletos"}), 400

    session = get_session()
    try:
        monto_decimal = Decimal(monto_raw)
        banco_clean = banco_origen.strip()
        
        # --- PASO 1: BUSCAR SI YA FUE VALIDADO (USANDO ILIKE TAMBIÉN) ---
        duplicado = session.query(PagoValidado).filter(
            PagoValidado.referencia.like(f"%{referencia_fin}"),
            PagoValidado.monto == monto_decimal,
            PagoValidado.banco_origen.ilike(f"%{banco_clean}%") # <--- Cambio clave
        ).first()

        if duplicado:
            return jsonify({
                "error": "PAGO YA VALIDADO ANTERIORMENTE",
                "usuario": duplicado.usuario_nombre,
                "fecha": duplicado.fecha_validacion.strftime("%d/%m/%Y %I:%M %p")
            }), 409

        # --- PASO 2: BUSCAR EL PAGO RECIBIDO ---
        # Quitamos .all() y usamos .first() para evitar el error de índice [0]
        p = session.query(PagoMovil).filter(
            PagoMovil.referencia.like(f"%{referencia_fin}"),
            PagoMovil.monto == monto_decimal,
            PagoMovil.banco_origen.ilike(f"%{banco_clean}%") 
        ).first()

        if not p:
            return jsonify({"error": "No se encontró ningún pago coincidente"}), 404

        # --- PASO 3: REGISTRAR ---
        venezuela_tz = pytz.timezone("America/Caracas")
        fecha_ahora_vzla = datetime.now(venezuela_tz).replace(tzinfo=None)
        
        validado = PagoValidado(
                    id=uuid.uuid4().hex,
                    id_mensaje=p.id_mensaje,
                    telefono_origen=p.telefono_origen,
                    banco_origen=p.banco_origen,
                    telefono_destino=p.telefono_destino,
                    banco_destino=p.banco_destino,
                    monto=p.monto,
                    referencia=p.referencia,
                    descripcion=p.descripcion,
                    fecha=p.fecha,
                    hora=p.hora,
                    tipo_transaccion=p.tipo_transaccion,
                    usuario_nombre=usuario_nombre,
                    fecha_validacion=fecha_ahora_vzla
        )
        session.add(validado)
        session.commit()
        
        return jsonify([{"status": "Validado exitosamente", "referencia": p.referencia}]), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/pagos/listar")
def listar_pagos():
    session = get_session()
    try:
        pagos = session.query(PagoMovil).all()
        resultado = []
        for p in pagos:
            resultado.append({
                "referencia": p.referencia,
                "banco_origen": p.banco_origen,
                "monto": str(p.monto),
                "fecha": str(p.fecha)
            })
        return jsonify(resultado), 200
    finally:
        session.close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)

