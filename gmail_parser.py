import base64
import re
import logging
from bs4 import BeautifulSoup
from datetime import datetime
from decimal import Decimal

log = logging.getLogger(__name__)

def get_body(msg_data):
    def buscar_partes(partes):
        for part in partes:
            mime = part.get("mimeType")
            body = part.get("body", {})
            data = body.get("data")

            if mime in ["text/plain", "text/html"] and data:
                return base64.urlsafe_b64decode(data.encode("UTF-8")).decode("UTF-8", errors="ignore")

            if "parts" in part:
                resultado = buscar_partes(part["parts"])
                if resultado:
                    return resultado

        return ""

    payload = msg_data.get("payload", {})

    if "data" in payload.get("body", {}):
        data = payload["body"]["data"]
        return base64.urlsafe_b64decode(data.encode("UTF-8")).decode("UTF-8", errors="ignore")

    if "parts" in payload:
        return buscar_partes(payload["parts"])

    return ""


# --- Parser para Pago Móvil ---
def parse_pago_movil(body_html):
    datos = {}
    soup = BeautifulSoup(body_html, "html.parser")

    for fila in soup.find_all("tr"):
        columnas = fila.find_all("td")
        if len(columnas) == 2:
            clave = columnas[0].get_text(strip=True)
            valor = columnas[1].get_text(strip=True)

            if "Desde Número" in clave:
                datos["telefono_origen"] = valor
            elif "Banco Origen" in clave:
                datos["banco_origen"] = valor
            elif "Al número" in clave:
                datos["telefono_destino"] = valor.rstrip(".")
            elif "Banco Destino" in clave:
                datos["banco_destino"] = valor
            elif "Monto" in clave:
                datos["monto"] = valor
            elif "Referencia" in clave:
                datos["referencia"] = valor
            elif "Descripción" in clave:
                datos["descripcion"] = valor

    texto_plano = soup.get_text(" ", strip=True)
    match_fecha_hora = re.search(r"(\d{2}/\d{2}/\d{4})\s+a las\s+(\d{1,2}:\d{2}:\d{2})", texto_plano)
    if match_fecha_hora:
        datos["fecha"] = match_fecha_hora.group(1)
        datos["hora"] = match_fecha_hora.group(2)

    return datos


# --- Parser para Transferencia Crédito Inmediato ---
def parse_transferencia(body_html):
    datos = {}
    soup = BeautifulSoup(body_html, "html.parser")

    for fila in soup.find_all("tr"):
        columnas = fila.find_all("td")
        if len(columnas) == 2:
            clave = columnas[0].get_text(strip=True)
            valor = columnas[1].get_text(strip=True)

            if "Cuenta Origen" in clave:
                datos["telefono_origen"] = valor
            elif "Banco Origen" in clave:
                datos["banco_origen"] = " ".join(valor.split())
            elif "Banco Destino" in clave:
                datos["banco_destino"] = valor
            elif "Cuenta/Número Celular Destino" in clave:
                datos["telefono_destino"] = valor
            elif "Monto" in clave:
                datos["monto"] = valor
            elif "No. de Referencia" in clave:
                datos["referencia"] = valor
            elif "Motivo" in clave:
                datos["descripcion"] = valor

    texto_plano = soup.get_text(" ", strip=True)
    match_fecha_hora = re.search(r"(\d{2}/\d{2}/\d{4})\s+a las\s+(\d{1,2}:\d{2}:\d{2})", texto_plano)
    if match_fecha_hora:
        datos["fecha"] = match_fecha_hora.group(1)
        datos["hora"] = match_fecha_hora.group(2)

    return datos


# --- Condicional según el Subject ---
def parse_condicional(subject, body_html):
    if "Pago Movil" in subject:
        return parse_pago_movil(body_html)
    elif "Transferencia Crédito Inmediato" in subject:
        return parse_transferencia(body_html)
    else:
        log.warning(f"Subject desconocido: {subject}")
        return None


def normalize_pago(datos):
    if not datos:
        return None

    monto_raw = datos.get("monto")
    fecha_raw = datos.get("fecha")
    hora_raw = datos.get("hora")

    monto = None
    if monto_raw:
        clean = re.sub(r"[^\d,\.]", "", monto_raw)
        if "," in clean and clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        elif "," in clean and clean.rfind(",") < clean.rfind("."):
            clean = clean.replace(",", "")
        else:
            clean = clean.replace(",", ".")
        try:
            monto = Decimal(clean)
        except:
            log.warning(f"No se pudo convertir monto: {monto_raw}")

    fecha = None
    if fecha_raw:
        try:
            fecha = datetime.strptime(fecha_raw, "%d/%m/%Y").date()
        except:
            log.warning(f"No se pudo convertir fecha: {fecha_raw}")

    hora = None
    if hora_raw:
        try:
            hora = datetime.strptime(hora_raw, "%H:%M:%S").time()
        except:
            log.warning(f"No se pudo convertir hora: {hora_raw}")

    return {
        "telefono_origen": datos.get("telefono_origen"),
        "banco_origen": datos.get("banco_origen"),
        "telefono_destino": datos.get("telefono_destino"),
        "banco_destino": datos.get("banco_destino"),
        "monto": monto,
        "referencia": datos.get("referencia"),
        "descripcion": datos.get("descripcion"),
        "fecha": fecha,
        "hora": hora,
    }
