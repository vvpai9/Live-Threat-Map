import geoip2.database

class GeoIP:
    def __init__(self, db_path="GeoLite2-City.mmdb"):
        self.reader = None
        try:
            self.reader = geoip2.database.Reader(db_path)
        except Exception:
            self.reader = None

    def lookup(self, ip):
        if not self.reader:
            return None
        try:
            r = self.reader.city(ip)
            return {
                "country": r.country.iso_code,
                "lat": r.location.latitude,
                "lon": r.location.longitude
            }
        except Exception:
            return None
