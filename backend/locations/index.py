import json
import os
import psycopg2
import urllib.request

def handler(event: dict, context) -> dict:
    """Сохранение, получение истории геолокаций и определение по IP."""

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    # IP геолокация — GET ?ip=1
    if method == 'GET' and 'ip' in params:
        ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', '')
        url = f'http://ip-api.com/json/{ip}?fields=status,lat,lon,city,regionName,country'
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        if data.get('status') != 'success':
            return {
                'statusCode': 502,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'IP lookup failed'}),
            }
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({
                'lat': data['lat'],
                'lon': data['lon'],
                'city': data.get('city', ''),
                'region': data.get('regionName', ''),
                'country': data.get('country', ''),
            }),
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            cur.execute(
                "SELECT id, lat, lng, accuracy, altitude, recorded_at FROM locations ORDER BY recorded_at DESC LIMIT 50"
            )
            rows = cur.fetchall()
            records = [
                {
                    'id': str(row[0]),
                    'lat': row[1],
                    'lng': row[2],
                    'accuracy': row[3],
                    'altitude': row[4],
                    'timestamp': row[5].isoformat(),
                }
                for row in rows
            ]
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'locations': records}),
            }

        elif method == 'POST':
            body = json.loads(event.get('body') or '{}')
            lat = body['lat']
            lng = body['lng']
            accuracy = body['accuracy']
            altitude = body.get('altitude')

            cur.execute(
                "INSERT INTO locations (lat, lng, accuracy, altitude) VALUES (%s, %s, %s, %s) RETURNING id, recorded_at",
                (lat, lng, accuracy, altitude),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'id': str(row[0]), 'timestamp': row[1].isoformat()}),
            }

        elif method == 'DELETE':
            cur.execute("DELETE FROM locations")
            conn.commit()
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True}),
            }

        else:
            return {'statusCode': 405, 'headers': cors_headers, 'body': 'Method Not Allowed'}

    finally:
        cur.close()
        conn.close()