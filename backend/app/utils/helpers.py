def error_response(message: str, error_code: str = "ERROR") -> dict:
    return {"success": False, "message": message, "error_code": error_code}


def success_response(message: str, data: dict = None) -> dict:
    r = {"success": True, "message": message}
    if data:
        r.update(data)
    return r
